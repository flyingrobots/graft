import { describe, expect, it, vi } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import type { WarpSidecarOpenOptions } from "../../../src/warp/sidecar.js";
import { InMemoryWarpPool, type WarpPoolWorkspace } from "../../../src/mcp/warp-pool.js";

function fakeWarpApp(): WarpApp {
  return {
    core: vi.fn(() => ({
      hasNode: vi.fn(() => Promise.resolve(false)),
      materialize: vi.fn(() => Promise.resolve()),
    })),
    observer: vi.fn(() => Promise.resolve({
      getNodes: () => Promise.resolve([]),
      getNodeProps: () => Promise.resolve(null),
      getEdges: () => Promise.resolve([]),
    })),
    patch: vi.fn(() => Promise.resolve("patch:test")),
  } as unknown as WarpApp;
}

function workspace(overrides: Partial<WarpPoolWorkspace> = {}): WarpPoolWorkspace {
  return {
    repoId: "repo:a",
    worktreeId: "worktree:a",
    worktreeRoot: "/tmp/project-a",
    gitCommonDir: "/tmp/project-a/.git",
    ...overrides,
  };
}

describe("mcp: warp pool", () => {
  it("reuses the same handle for one repo, worktree, and actor", async () => {
    const sharedApp = fakeWarpApp();
    const openSidecar = vi.fn((_options: WarpSidecarOpenOptions) => Promise.resolve(sharedApp));
    const pool = new InMemoryWarpPool({ graphRoot: "/tmp/graft-graphs", openSidecar });
    const identity = workspace();

    const first = await pool.getOrOpen(identity, "graft_session_a");
    const second = await pool.getOrOpen(identity, "graft_session_a");

    expect(first).toBe(second);
    expect(openSidecar).toHaveBeenCalledTimes(1);
    expect(openSidecar).toHaveBeenCalledWith(expect.objectContaining({
      writerId: "graft_session_a",
      sidecarRepo: pool.locationFor(identity, "graft_session_a").repoPath,
    }));
    expect(pool.size()).toBe(1);
  });

  it("opens distinct handles for linked worktrees in one repo", async () => {
    const primaryApp = fakeWarpApp();
    const secondaryApp = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockResolvedValueOnce(primaryApp)
      .mockResolvedValueOnce(secondaryApp);
    const pool = new InMemoryWarpPool({ graphRoot: "/tmp/graft-graphs", openSidecar });
    const primary = workspace();
    const secondary = workspace({
      worktreeId: "worktree:b",
      worktreeRoot: "/tmp/project-a-secondary",
    });

    const primaryResult = await pool.getOrOpen(primary, "graft_session_a");
    const secondaryResult = await pool.getOrOpen(secondary, "graft_session_a");

    expect(primaryResult).toBe(primaryApp);
    expect(secondaryResult).toBe(secondaryApp);
    expect(pool.locationFor(primary, "graft_session_a").repoPath)
      .not.toBe(pool.locationFor(secondary, "graft_session_a").repoPath);
    expect(openSidecar).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
  });

  it("opens distinct handles for independent actors in one worktree", async () => {
    const firstApp = fakeWarpApp();
    const secondApp = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockResolvedValueOnce(firstApp)
      .mockResolvedValueOnce(secondApp);
    const pool = new InMemoryWarpPool({ graphRoot: "/tmp/graft-graphs", openSidecar });
    const identity = workspace();

    const first = await pool.getOrOpen(identity, "graft_session_a");
    const second = await pool.getOrOpen(identity, "graft_session_b");

    expect(first).toBe(firstApp);
    expect(second).toBe(secondApp);
    expect(pool.locationFor(identity, "graft_session_a").repoPath)
      .not.toBe(pool.locationFor(identity, "graft_session_b").repoPath);
    expect(openSidecar).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
  });

  it("evicts only the failed full identity so a later open can retry", async () => {
    const app = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockRejectedValueOnce(new Error("sidecar unavailable"))
      .mockResolvedValueOnce(app);
    const pool = new InMemoryWarpPool({ graphRoot: "/tmp/graft-graphs", openSidecar });
    const identity = workspace();

    await expect(pool.getOrOpen(identity, "graft_session_a")).rejects.toThrow("sidecar unavailable");
    await expect(pool.getOrOpen(identity, "graft_session_a")).resolves.toBe(app);

    expect(openSidecar).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
  });

  it("tracks unique source repos instead of sidecar handles in size()", async () => {
    const openSidecar = vi.fn(() => Promise.resolve(fakeWarpApp()));
    const pool = new InMemoryWarpPool({ graphRoot: "/tmp/graft-graphs", openSidecar });

    await pool.getOrOpen(workspace(), "graft_session_a");
    await pool.getOrOpen(workspace({ worktreeId: "worktree:b", worktreeRoot: "/tmp/b" }), "graft_session_a");
    await pool.getOrOpen(workspace({
      repoId: "repo:b",
      worktreeId: "worktree:c",
      worktreeRoot: "/tmp/c",
      gitCommonDir: "/tmp/c/.git",
    }), "graft_session_a");

    expect(pool.size()).toBe(2);
    expect(openSidecar).toHaveBeenCalledTimes(3);
  });
});
