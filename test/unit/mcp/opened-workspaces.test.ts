import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { createServerInRepo, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createRepo(prefix: string, content: string): string {
  const repoDir = createCommittedTestRepo(prefix, {
    "app.ts": content,
  });
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return repoDir;
}

interface ListedOpenedWorkspace {
  readonly worktreeRoot: string;
  readonly active: boolean;
  readonly source: "startup" | "session_opened" | "daemon_authorized";
}

interface WorkspaceListOpenedPayload {
  readonly sessionMode: "repo_local" | "daemon";
  readonly activeWorktreeId: string | null;
  readonly workspaces: readonly ListedOpenedWorkspace[];
}

async function listOpened(server: ReturnType<typeof createServerInRepo>): Promise<WorkspaceListOpenedPayload> {
  return parse(await server.callTool("workspace_list_opened", {})) as unknown as WorkspaceListOpenedPayload;
}

describe("mcp: opened workspace paths", () => {
  it("records an opened workspace in the opened-workspace list", async () => {
    const initialRepo = createRepo("graft-opened-initial-", "export const repo = 'initial';\n");
    const nextRepo = createRepo("graft-opened-next-", "export const repo = 'next';\n");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", {
      cwd: nextRepo,
      activate: false,
    }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      changed: true,
      freshSessionSlice: false,
    }));

    const listed = await listOpened(server);
    expect(listed.sessionMode).toBe("repo_local");
    expect(listed.workspaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(initialRepo),
        active: true,
        source: "startup",
      }),
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(nextRepo),
        active: false,
        source: "session_opened",
      }),
    ]));
  });

  it("opens with activate=true and makes the opened workspace active", async () => {
    const initialRepo = createRepo("graft-opened-activate-initial-", "export const repo = 'initial';\n");
    const nextRepo = createRepo("graft-opened-activate-next-", "export const repo = 'next';\n");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", {
      cwd: nextRepo,
      activate: true,
    }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: true,
      worktreeRoot: fs.realpathSync(nextRepo),
    }));

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(read["content"]).toBe("export const repo = 'next';\n");

    const listed = await listOpened(server);
    expect(listed.workspaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(initialRepo),
        active: false,
      }),
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(nextRepo),
        active: true,
      }),
    ]));
  });

  it("opens with activate omitted and treats activation as the default", async () => {
    const initialRepo = createRepo("graft-opened-default-initial-", "export const repo = 'initial';\n");
    const nextRepo = createRepo("graft-opened-default-next-", "export const repo = 'next';\n");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", { cwd: nextRepo }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: true,
      worktreeRoot: fs.realpathSync(nextRepo),
    }));

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(read["content"]).toBe("export const repo = 'next';\n");
  });

  it("opens with activate=false without changing the active workspace", async () => {
    const initialRepo = createRepo("graft-opened-inactive-initial-", "export const repo = 'initial';\n");
    const nextRepo = createRepo("graft-opened-inactive-next-", "export const repo = 'next';\n");
    const server = createServerInRepo(initialRepo);

    const opened = parse(await server.callTool("workspace_open", {
      cwd: nextRepo,
      activate: false,
    }));
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      freshSessionSlice: false,
      worktreeRoot: fs.realpathSync(initialRepo),
    }));

    const read = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(read["content"]).toBe("export const repo = 'initial';\n");

    const listed = await listOpened(server);
    expect(listed.workspaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(nextRepo),
        active: false,
      }),
    ]));
  });

  it("keeps repo-local opened workspaces process-local across server sessions", async () => {
    const initialRepo = createRepo("graft-opened-local-initial-", "export const repo = 'initial';\n");
    const nextRepo = createRepo("graft-opened-local-next-", "export const repo = 'next';\n");
    const firstServer = createServerInRepo(initialRepo);

    await firstServer.callTool("workspace_open", {
      cwd: nextRepo,
      activate: false,
    });
    const firstList = await listOpened(firstServer);
    expect(firstList.workspaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(nextRepo),
      }),
    ]));

    const secondServer = createServerInRepo(initialRepo);
    const secondList = await listOpened(secondServer);
    expect(secondList.workspaces).toEqual([
      expect.objectContaining({
        worktreeRoot: fs.realpathSync(initialRepo),
        active: true,
        source: "startup",
      }),
    ]);
  });
});
