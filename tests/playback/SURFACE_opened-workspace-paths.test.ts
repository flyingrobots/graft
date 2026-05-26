import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { cleanupTestRepo, createCommittedTestRepo } from "../../test/helpers/git.js";
import { createManagedDaemonServer, createServerInRepo, parse } from "../../test/helpers/mcp.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createRepo(prefix: string, marker: string): string {
  const repoDir = createCommittedTestRepo(prefix, {
    "app.ts": [
      `export const workspaceMarker = "${marker}";`,
      `export function ${marker}Thing() {`,
      "  return workspaceMarker;",
      "}",
      "",
    ].join("\n"),
  });
  const realRepoDir = fs.realpathSync.native(repoDir);
  cleanups.push(() => {
    cleanupTestRepo(realRepoDir);
  });
  return realRepoDir;
}

interface OpenedWorkspace {
  readonly worktreeRoot: string;
  readonly source: "startup" | "session_opened" | "daemon_authorized";
  readonly active: boolean;
  readonly capabilityProfile: { readonly runCapture: boolean };
}

interface OpenedWorkspaceList {
  readonly activeWorktreeId: string | null;
  readonly workspaces: readonly OpenedWorkspace[];
}

function workspaceFor(list: OpenedWorkspaceList, worktreeRoot: string): OpenedWorkspace {
  const workspace = list.workspaces.find((candidate) => candidate.worktreeRoot === worktreeRoot);
  if (workspace === undefined) {
    throw new Error(`Missing opened workspace for ${worktreeRoot}`);
  }
  return workspace;
}

describe("SURFACE opened workspace paths playback", () => {
  it("Can I tell an agent to work in another repo and have it open that path in the existing Graft MCP session?", async () => {
    const initialRepo = createRepo("graft-playback-open-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-open-next-", "beta");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", { cwd: nextRepo }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: true,
      worktreeRoot: nextRepo,
    }));

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(read["content"]).toContain("betaThing");
  });

  it("Can I inspect which paths are opened and which one is active?", async () => {
    const initialRepo = createRepo("graft-playback-list-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-list-next-", "beta");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", { cwd: nextRepo }));
    const listed = parse(await server.callTool("workspace_list_opened", {})) as unknown as OpenedWorkspaceList;

    expect(listed.activeWorktreeId).toBe(opened["worktreeId"]);
    expect(workspaceFor(listed, initialRepo)).toEqual(expect.objectContaining({
      source: "startup",
      active: false,
    }));
    expect(workspaceFor(listed, nextRepo)).toEqual(expect.objectContaining({
      source: "session_opened",
      active: true,
    }));
  });

  it("Does switching repos feel like opening another workspace, not editing low-level daemon authorization state by hand?", async () => {
    const initialRepo = createRepo("graft-playback-ergonomic-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-ergonomic-next-", "beta");
    const server = createServerInRepo(initialRepo);

    expect(server.getRegisteredTools()).toContain("workspace_open");
    expect(server.getRegisteredTools()).toContain("workspace_list_opened");
    expect(server.getRegisteredTools()).toContain("workspace_status");
    expect(server.getRegisteredTools()).not.toContain("workspace_authorize");
    expect(server.getRegisteredTools()).not.toContain("workspace_bind");

    const inactiveOpen = parse(await server.callTool("workspace_open", {
      cwd: nextRepo,
      activate: false,
    }));
    expect(inactiveOpen).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: false,
      worktreeRoot: initialRepo,
    }));

    const activatedOpen = parse(await server.callTool("workspace_open", { cwd: nextRepo }));
    expect(activatedOpen).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: true,
      worktreeRoot: nextRepo,
    }));
  });

  it("Can a repo-local MCP server open a second git worktree and run `safe_read`, `graft_map`, and `code_find` against it without process restart?", async () => {
    const initialRepo = createRepo("graft-playback-tools-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-tools-next-", "beta");
    const server = createServerInRepo(initialRepo);

    await server.callTool("workspace_open", { cwd: nextRepo });

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(read["content"]).toContain("betaThing");

    const map = parse(await server.callTool("graft_map", {})) as {
      files?: { path: string; symbols: { name: string }[] }[];
    };
    expect(map.files?.flatMap((file) => file.symbols.map((symbol) => symbol.name))).toContain("betaThing");

    const find = parse(await server.callTool("code_find", { query: "betaThing" })) as {
      total?: number;
      matches?: { path: string; name: string }[];
    };
    expect(find.total).toBeGreaterThan(0);
    expect(find.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "app.ts", name: "betaThing" }),
    ]));
  });

  it("Does activation reset session-local cache, budget, saved state, metrics, and repo-state tracking instead of bleeding state across worktrees?", async () => {
    const initialRepo = createRepo("graft-playback-reset-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-reset-next-", "beta");
    const server = createServerInRepo(initialRepo);

    await server.callTool("state_save", { content: "alpha state" });
    await server.callTool("set_budget", { bytes: 100_000 });
    const before = parse(await server.callTool("state_load", {}));
    expect(before["content"]).toBe("alpha state");

    const opened = parse(await server.callTool("workspace_open", { cwd: nextRepo }));
    expect(opened["freshSessionSlice"]).toBe(true);

    const after = parse(await server.callTool("state_load", {}));
    expect(after["content"]).toBeNull();

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    const receipt = read["_receipt"] as Record<string, unknown>;
    expect(receipt["budget"]).toBeUndefined();
    expect(read["content"]).toContain("betaThing");
  });

  it("Does daemon mode reuse the existing authorization registry and capability profile rather than creating a parallel allowlist?", async () => {
    const repoDir = createRepo("graft-playback-daemon-open-", "daemon");
    const server = createManagedDaemonServer(cleanups);

    const initialOpen = parse(await server.callTool("workspace_open", {
      cwd: repoDir,
    }));
    expect(initialOpen).toEqual(expect.objectContaining({
      ok: true,
      capabilityProfile: expect.objectContaining({ runCapture: false }),
    }));

    const opened = parse(await server.callTool("workspace_open", {
      cwd: repoDir,
      runCapture: true,
    }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: true,
      worktreeRoot: repoDir,
      capabilityProfile: expect.objectContaining({ runCapture: true }),
    }));
    expect(opened["openedWorkspace"]).toEqual(expect.objectContaining({
      source: "daemon_authorized",
      capabilityProfile: expect.objectContaining({ runCapture: true }),
    }));

    const authorizations = parse(await server.callTool("workspace_authorizations", {})) as {
      workspaces?: OpenedWorkspace[];
    };
    expect(authorizations.workspaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        worktreeRoot: repoDir,
        capabilityProfile: expect.objectContaining({ runCapture: true }),
      }),
    ]));

    const capture = parse(await server.callTool("run_capture", {
      command: "printf 'daemon-ok'",
      tail: 1,
    }));
    expect(capture["output"]).toContain("daemon-ok");
  });

  it("Do repo-scoped tools keep their current repo-relative schemas?", async () => {
    const initialRepo = createRepo("graft-playback-relative-initial-", "alpha");
    const nextRepo = createRepo("graft-playback-relative-next-", "beta");
    const server = createServerInRepo(initialRepo);

    await server.callTool("workspace_open", { cwd: nextRepo });

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    const find = parse(await server.callTool("code_find", { query: "betaThing" })) as {
      matches?: { path: string; name: string }[];
    };

    expect(read["path"]).toBe(`${nextRepo}/app.ts`);
    expect(read["content"]).toContain("betaThing");
    expect(find.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "app.ts", name: "betaThing" }),
    ]));
  });
});
