import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createInProcessDaemonHarness } from "../../helpers/daemon.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function createRepo(prefix: string, content: string): string {
  const repoDir = createCommittedTestRepo(prefix, {
    "app.ts": content,
  });
  const realRepoDir = fs.realpathSync(repoDir);
  cleanups.push(() => {
    cleanupTestRepo(realRepoDir);
  });
  return realRepoDir;
}

describe("mcp: per-call workspace route", () => {
  it("routes safe_read through cwd without binding the daemon session", { timeout: 15_000 }, async () => {
    const repoDir = createRepo("graft-route-unbound-", "export const repo = 'routed';\n");
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    const opened = await session.callToolJson<{
      ok: boolean;
      bindState: string;
      worktreeRoot: string | null;
    }>("workspace_open", {
      cwd: repoDir,
      activate: false,
    });
    expect(opened).toEqual(expect.objectContaining({
      ok: true,
      bindState: "unbound",
      worktreeRoot: null,
    }));

    const routedRead = await session.callToolJson<{
      projection: string;
      path: string;
      content: string;
    }>("safe_read", {
      cwd: repoDir,
      path: "app.ts",
    });

    expect(routedRead.projection).toBe("content");
    expect(routedRead.path).toBe(path.join(repoDir, "app.ts"));
    expect(routedRead.content).toBe("export const repo = 'routed';\n");

    const status = await session.callToolJson<{
      bindState: string;
      worktreeRoot: string | null;
    }>("workspace_status", {});
    expect(status.bindState).toBe("unbound");
    expect(status.worktreeRoot).toBeNull();
  });

  it("keeps a routed safe_read on its cwd after another workspace becomes active", { timeout: 15_000 }, async () => {
    const repoA = createRepo("graft-route-repo-a-", "export const repo = 'a';\n");
    const repoB = createRepo("graft-route-repo-b-", "export const repo = 'b';\n");
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    const firstOpen = await session.callToolJson<{ ok: boolean; worktreeRoot: string }>("workspace_open", {
      cwd: repoA,
      activate: true,
    });
    expect(firstOpen).toEqual(expect.objectContaining({
      ok: true,
      worktreeRoot: repoA,
    }));

    const secondOpen = await session.callToolJson<{ ok: boolean; worktreeRoot: string }>("workspace_open", {
      cwd: repoB,
      activate: true,
    });
    expect(secondOpen).toEqual(expect.objectContaining({
      ok: true,
      worktreeRoot: repoB,
    }));

    const routedRead = await session.callToolJson<{ content: string; path: string }>("safe_read", {
      cwd: repoA,
      path: "app.ts",
    });
    expect(routedRead.path).toBe(path.join(repoA, "app.ts"));
    expect(routedRead.content).toBe("export const repo = 'a';\n");

    const activeRead = await session.callToolJson<{ content: string; path: string }>("safe_read", {
      path: "app.ts",
    });
    expect(activeRead.path).toBe(path.join(repoB, "app.ts"));
    expect(activeRead.content).toBe("export const repo = 'b';\n");

    const status = await session.callToolJson<{ bindState: string; worktreeRoot: string | null }>(
      "workspace_status",
      {},
    );
    expect(status.bindState).toBe("bound");
    expect(status.worktreeRoot).toBe(repoB);
  });

  it("routes structural search through cwd after another workspace becomes active", { timeout: 15_000 }, async () => {
    const repoA = createRepo("graft-route-code-a-", [
      "export function onlyInA(): string {",
      "  return 'a';",
      "}",
      "",
    ].join("\n"));
    const repoB = createRepo("graft-route-code-b-", [
      "export function onlyInB(): string {",
      "  return 'b';",
      "}",
      "",
    ].join("\n"));
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    await session.callToolJson("workspace_open", {
      cwd: repoA,
      activate: true,
    });
    await session.callToolJson("workspace_open", {
      cwd: repoB,
      activate: true,
    });

    const routedFind = await session.callToolJson<{
      total: number;
      matches: { path: string; name: string }[];
    }>("code_find", {
      cwd: repoA,
      query: "onlyInA",
    });
    expect(routedFind.total).toBe(1);
    expect(routedFind.matches).toEqual([
      expect.objectContaining({ path: "app.ts", name: "onlyInA" }),
    ]);

    const activeFind = await session.callToolJson<{ total: number }>("code_find", {
      query: "onlyInA",
    });
    expect(activeFind.total).toBe(0);
  });
});
