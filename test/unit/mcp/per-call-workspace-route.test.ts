import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";
import { openWarp } from "../../../src/warp/open.js";
import { createInProcessDaemonHarness } from "../../helpers/daemon.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

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

function createSameRepoWorktrees(): { primary: string; secondary: string } {
  const primary = createRepo(
    "graft-route-same-repo-",
    "export function baseline(): string { return 'baseline'; }\n",
  );
  const secondary = `${primary}-secondary`;
  git(primary, `worktree add -b secondary ${secondary}`);
  cleanups.push(() => {
    fs.rmSync(secondary, { recursive: true, force: true });
  });
  return { primary, secondary: fs.realpathSync(secondary) };
}

describe("mcp: per-call workspace route", () => {
  it("ignores cwd routing for repo-local tool calls", async () => {
    const repoA = createRepo("graft-route-local-a-", "export const repo = 'a';\n");
    const repoB = createRepo("graft-route-local-b-", "export const repo = 'b';\n");
    const server = createServerInRepo(repoA);

    const read = parse(await server.callTool("safe_read", {
      cwd: repoB,
      path: "app.ts",
    }));

    expect(read).toEqual(expect.objectContaining({
      projection: "content",
      path: path.join(repoA, "app.ts"),
      content: "export const repo = 'a';\n",
    }));
  });

  it("rejects routed calls to unauthorized daemon workspaces", { timeout: 15_000 }, async () => {
    const repoDir = createRepo("graft-route-unauthorized-", "export const repo = 'unauthorized';\n");
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    await expect(session.callToolJson("safe_read", {
      cwd: repoDir,
      path: "app.ts",
    })).rejects.toMatchObject({
      name: "WorkspaceRouteUnauthorizedError",
      code: "WORKSPACE_NOT_AUTHORIZED",
    });

    await expect(session.callToolJson("code_find", {
      cwd: repoDir,
      query: "repo",
    })).rejects.toThrow(/not authorized for routed daemon access/);

    const status = await session.callToolJson<{
      bindState: string;
      worktreeRoot: string | null;
    }>("workspace_status", {});
    expect(status.bindState).toBe("unbound");
    expect(status.worktreeRoot).toBeNull();
  });

  it("does not transfer authorization when an authorized path becomes another repository", {
    timeout: 20_000,
  }, async () => {
    const repoDir = createRepo("graft-route-authorized-original-", "export const original = true;\n");
    const replacementSource = createRepo(
      "graft-route-unauthorized-replacement-",
      "export const replacement = true;\n",
    );
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    await session.callToolJson("workspace_open", { cwd: repoDir, activate: true });
    fs.rmSync(repoDir, { recursive: true, force: true });
    git(replacementSource, `worktree add -b replacement ${repoDir}`);

    await expect(session.callToolJson("safe_read", {
      cwd: repoDir,
      path: "app.ts",
    })).rejects.toMatchObject({
      name: "WorkspaceRouteUnauthorizedError",
      code: "WORKSPACE_NOT_AUTHORIZED",
    });
  });

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

  it("does not charge routed calls to the active workspace governor", { timeout: 15_000 }, async () => {
    const repoA = createRepo("graft-route-governor-a-", "export const repo = 'a';\n");
    const repoB = createRepo("graft-route-governor-b-", "export const repo = 'b';\n");
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

    const before = await session.callToolJson<{ totalMessages: number }>("doctor", {});
    await session.callToolJson("safe_read", {
      cwd: repoA,
      path: "app.ts",
    });
    const after = await session.callToolJson<{ totalMessages: number }>("doctor", {});

    expect(after.totalMessages).toBe(before.totalMessages + 1);
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

  it("keeps an in-flight routed WARP resident through LRU eviction and releases it at settlement", {
    timeout: 30_000,
  }, async () => {
    const routedRepo = createRepo(
      "graft-route-in-flight-warp-",
      "export function retainedDuringCall(): string { return 'retained'; }\n",
    );
    const churnRepos = Array.from({ length: 8 }, (_unused, index) => {
      return createRepo(
        `graft-route-lru-churn-${String(index)}-`,
        `export const churn${String(index)} = true;\n`,
      );
    });
    let markOpenStarted!: () => void;
    let releaseOpen!: () => void;
    const openStarted = new Promise<void>((resolve) => {
      markOpenStarted = resolve;
    });
    const openGate = new Promise<void>((resolve) => {
      releaseOpen = resolve;
    });
    cleanups.push(() => {
      releaseOpen();
    });
    let routedWriterId: string | null = null;
    const pool = new InMemoryWarpPool(async (cwd, writerId) => {
      const app = await openWarp({ cwd, writerId });
      if (cwd === routedRepo) {
        routedWriterId = writerId;
        markOpenStarted();
        await openGate;
      }
      return app;
    });
    const harness = await createInProcessDaemonHarness({ warpPool: pool });
    cleanups.push(() => harness.close());
    const session = harness.createSession();
    const opened = await session.callToolJson<{
      openedWorkspace: { repoId: string };
    }>("workspace_open", {
      cwd: routedRepo,
      activate: false,
    });
    for (const cwd of churnRepos) {
      await session.callToolJson("workspace_open", { cwd, activate: false });
    }

    const inFlight = session.callToolJson<{ total: number }>("code_find", {
      cwd: routedRepo,
      query: "retainedDuringCall",
    });
    await openStarted;
    for (const cwd of churnRepos) {
      await session.callToolJson("safe_read", { cwd, path: "app.ts" });
    }
    expect(routedWriterId).toEqual(expect.any(String));
    const routedRepoId = opened.openedWorkspace.repoId;
    const residentDuringCall = pool.has(routedRepoId, routedWriterId!);
    const leasesDuringCall = pool.leaseCount(routedRepoId, routedWriterId!);

    releaseOpen();
    const result = await inFlight;

    expect(residentDuringCall).toBe(true);
    expect(leasesDuringCall).toBe(1);
    expect(result.total).toBe(1);
    expect(pool.has(routedRepoId, routedWriterId!)).toBe(false);
    expect(pool.leaseCount(routedRepoId, routedWriterId!)).toBe(0);
  });

  it.each([
    { toolName: "graft_churn", args: {} },
    { toolName: "causal_status", args: {} },
    { toolName: "causal_attach", args: { actor_kind: "agent" } },
  ] as const)("keeps a bound WARP resident leased while unscheduled $toolName survives rebind", {
    timeout: 30_000,
  }, async ({ toolName, args }) => {
    const originalRepo = createRepo(
      "graft-bound-in-flight-warp-",
      "export function retainedDuringRebind(): string { return 'retained'; }\n",
    );
    const replacementRepo = createRepo(
      "graft-bound-replacement-warp-",
      "export const replacement = true;\n",
    );
    let markObserverStarted!: () => void;
    let releaseObserver!: () => void;
    const observerStarted = new Promise<void>((resolve) => {
      markObserverStarted = resolve;
    });
    const observerGate = new Promise<void>((resolve) => {
      releaseObserver = resolve;
    });
    cleanups.push(() => {
      releaseObserver();
    });
    let holdNextObserver = false;
    let originalWriterId: string | null = null;
    const pool = new InMemoryWarpPool(async (cwd, writerId) => {
      const app = await openWarp({ cwd, writerId });
      if (cwd !== originalRepo) {
        return app;
      }
      originalWriterId = writerId;
      return new Proxy(app, {
        get(target, property) {
          if (property === "observer") {
            return async (...args: Parameters<typeof app.observer>) => {
              if (holdNextObserver) {
                holdNextObserver = false;
                markObserverStarted();
                await observerGate;
              }
              return app.observer(...args);
            };
          }
          const value: unknown = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    });
    const harness = await createInProcessDaemonHarness({ warpPool: pool });
    cleanups.push(() => harness.close());
    const session = harness.createSession();
    const opened = await session.callToolJson<{
      openedWorkspace: { repoId: string };
    }>("workspace_open", {
      cwd: originalRepo,
      activate: true,
    });

    holdNextObserver = true;
    const inFlight = session.callToolJson(toolName, args);
    await observerStarted;
    expect(originalWriterId).toEqual(expect.any(String));
    await session.callToolJson("workspace_open", {
      cwd: replacementRepo,
      activate: true,
    });
    const residentDuringRebind = pool.has(opened.openedWorkspace.repoId, originalWriterId!);
    const leasesDuringRebind = pool.leaseCount(opened.openedWorkspace.repoId, originalWriterId!);

    releaseObserver();
    const result = await inFlight;

    expect(residentDuringRebind).toBe(true);
    expect(leasesDuringRebind).toBe(1);
    if (toolName === "graft_churn") {
      expect(result["totalCommitsAnalyzed"]).toEqual(expect.any(Number));
    } else {
      expect(result).toEqual(expect.objectContaining({
        bindState: "bound",
        repoId: opened.openedWorkspace.repoId,
      }));
    }
    expect(pool.has(opened.openedWorkspace.repoId, originalWriterId!)).toBe(false);
    expect(pool.leaseCount(opened.openedWorkspace.repoId, originalWriterId!)).toBe(0);
  });

  it("routes graft_since to either dirty worktree of one repository and witnesses the selected authority", {
    timeout: 20_000,
  }, async () => {
    const { primary, secondary } = createSameRepoWorktrees();
    const commonBase = git(primary, "rev-parse HEAD");
    fs.writeFileSync(
      path.join(primary, "app.ts"),
      "export function onlyInPrimary(): string { return 'primary'; }\n",
    );
    git(primary, "add app.ts");
    git(primary, "commit -m primary-change");
    fs.writeFileSync(
      path.join(secondary, "app.ts"),
      "export function onlyInSecondary(): string { return 'secondary'; }\n",
    );
    git(secondary, "add app.ts");
    git(secondary, "commit -m secondary-change");
    fs.writeFileSync(path.join(primary, "dirty-primary.ts"), "export const dirtyPrimary = true;\n");
    fs.writeFileSync(path.join(secondary, "dirty-secondary.ts"), "export const dirtySecondary = true;\n");

    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();
    await session.callToolJson("workspace_open", { cwd: primary, activate: true });
    await session.callToolJson("workspace_open", { cwd: secondary, activate: true });

    interface RoutedSince extends Record<string, unknown> {
      files: { path: string; diff: { added: { name: string }[] } }[];
      _schema: {
        id: "graft.mcp.graft_since";
        version: "2.0.0";
      };
      _workspace: {
        route: "explicit_cwd";
        requestedRoot: string;
        resolvedRoot: string;
        repoId: string;
        worktreeId: string;
      };
      _receipt: {
        workspace: RoutedSince["_workspace"];
      };
    }

    const primaryResult = await session.callToolJson<RoutedSince>("graft_since", {
      cwd: primary,
      base: commonBase,
      head: "HEAD",
    });
    expect(primaryResult.files).toHaveLength(1);
    expect(primaryResult.files[0]).toEqual(expect.objectContaining({
      path: "app.ts",
      diff: expect.objectContaining({
        added: [expect.objectContaining({ name: "onlyInPrimary" })],
      }),
    }));
    expect(primaryResult._workspace).toEqual({
      route: "explicit_cwd",
      requestedRoot: primary,
      resolvedRoot: primary,
      repoId: expect.any(String),
      worktreeId: expect.any(String),
    });
    expect(primaryResult._schema).toEqual({
      id: "graft.mcp.graft_since",
      version: "2.0.0",
    });
    expect(primaryResult._receipt.workspace).toEqual(primaryResult._workspace);
    expect(() => MCP_OUTPUT_SCHEMAS.graft_since.parse(primaryResult)).not.toThrow();

    const secondaryResult = await session.callToolJson<RoutedSince>("graft_since", {
      cwd: secondary,
      base: commonBase,
      head: "HEAD",
    });
    expect(secondaryResult.files).toHaveLength(1);
    expect(secondaryResult.files[0]).toEqual(expect.objectContaining({
      path: "app.ts",
      diff: expect.objectContaining({
        added: [expect.objectContaining({ name: "onlyInSecondary" })],
      }),
    }));
    expect(secondaryResult._workspace).toEqual({
      route: "explicit_cwd",
      requestedRoot: secondary,
      resolvedRoot: secondary,
      repoId: primaryResult._workspace.repoId,
      worktreeId: expect.any(String),
    });
    expect(secondaryResult._workspace.worktreeId).not.toBe(primaryResult._workspace.worktreeId);
    expect(secondaryResult._receipt.workspace).toEqual(secondaryResult._workspace);
    expect(() => MCP_OUTPUT_SCHEMAS.graft_since.parse(secondaryResult)).not.toThrow();

    const status = await session.callToolJson<{ worktreeRoot: string }>("workspace_status", {});
    expect(status.worktreeRoot).toBe(secondary);
  });

  it("fails a routed structural read with typed resolution evidence when cwd is missing", async () => {
    const repoDir = createRepo("graft-route-missing-", "export const repo = 'present';\n");
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const session = harness.createSession();

    await expect(session.callToolJson("graft_since", {
      cwd: path.join(repoDir, "missing-worktree"),
      base: "HEAD",
    })).rejects.toMatchObject({
      name: "WorkspaceResolutionError",
      code: "NOT_A_GIT_REPO",
    });
  });
});
