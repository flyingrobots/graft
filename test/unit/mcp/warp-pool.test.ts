import { describe, expect, it, vi } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import type { WarpSidecarOpenOptions } from "../../../src/warp/sidecar.js";
import { InMemoryWarpPool, type WarpPoolWorkspace } from "../../../src/mcp/warp-pool.js";
import { FIXTURE_WARP_GRAPH_ROOT } from "../../helpers/warp-pool.js";

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
    worktreeRoot: "/fixture/project-a",
    gitCommonDir: "/fixture/project-a/.git",
    ...overrides,
  };
}

function createPool(openSidecar: (options: WarpSidecarOpenOptions) => Promise<WarpApp>): InMemoryWarpPool {
  return new InMemoryWarpPool({
    graphRoot: FIXTURE_WARP_GRAPH_ROOT,
    openSidecar,
    maxIdleResidents: 0,
    maxResidents: 64,
  });
}

describe("mcp: warp pool", () => {
  it("reuses the same handle for one repo, worktree, and writer lane", async () => {
    const sharedApp = fakeWarpApp();
    const openSidecar = vi.fn((_options: WarpSidecarOpenOptions) => Promise.resolve(sharedApp));
    const pool = createPool(openSidecar);
    const input = { workspace: workspace(), writerId: "graft_session_a", ownerId: "session:a" };

    const first = await pool.acquire(input);
    const second = await pool.acquire(input);

    expect(first.app).toBe(second.app);
    expect(openSidecar).toHaveBeenCalledTimes(1);
    expect(openSidecar).toHaveBeenCalledWith({
      graphRoot: FIXTURE_WARP_GRAPH_ROOT,
      sidecarRepo: pool.locationFor(input.workspace, "graft_session_a").repoPath,
      writerId: "graft_session_a",
    });
    expect(pool.size()).toBe(1);
    await first.release();
    await second.release();
  });

  it("opens distinct handles for linked worktrees in one repo", async () => {
    const primaryApp = fakeWarpApp();
    const secondaryApp = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockResolvedValueOnce(primaryApp)
      .mockResolvedValueOnce(secondaryApp);
    const pool = createPool(openSidecar);
    const primary = workspace();
    const secondary = workspace({
      worktreeId: "worktree:b",
      worktreeRoot: "/fixture/project-a-secondary",
    });

    const primaryLease = await pool.acquire({ workspace: primary, writerId: "graft_session_a", ownerId: "a" });
    const secondaryLease = await pool.acquire({ workspace: secondary, writerId: "graft_session_a", ownerId: "b" });

    expect(primaryLease.app).toBe(primaryApp);
    expect(secondaryLease.app).toBe(secondaryApp);
    expect(pool.locationFor(primary, "graft_session_a").repoPath)
      .not.toBe(pool.locationFor(secondary, "graft_session_a").repoPath);
    expect(openSidecar).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
    expect(pool.residentCount()).toBe(2);
    await primaryLease.release();
    await secondaryLease.release();
  });

  it("opens distinct handles for different writer lanes in one worktree", async () => {
    const sessionApp = fakeWarpApp();
    const monitorApp = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockResolvedValueOnce(sessionApp)
      .mockResolvedValueOnce(monitorApp);
    const pool = createPool(openSidecar);
    const identity = workspace();

    const sessionResult = await pool.acquire({ workspace: identity, writerId: "graft", ownerId: "session:a" });
    const monitorResult = await pool.acquire({
      workspace: identity,
      writerId: "graft_monitor_deadbeef",
      ownerId: "monitor:a",
    });

    expect(sessionResult.app).toBe(sessionApp);
    expect(monitorResult.app).toBe(monitorApp);
    expect(pool.locationFor(identity, "graft").repoPath)
      .not.toBe(pool.locationFor(identity, "graft_monitor_deadbeef").repoPath);
    expect(openSidecar).toHaveBeenNthCalledWith(1, expect.objectContaining({ writerId: "graft" }));
    expect(openSidecar).toHaveBeenNthCalledWith(2, expect.objectContaining({ writerId: "graft_monitor_deadbeef" }));
    expect(pool.size()).toBe(1);
    expect(pool.residentCount()).toBe(2);
    await sessionResult.release();
    expect(pool.size()).toBe(1);
    expect(pool.residentCount()).toBe(1);
    await monitorResult.release();
    expect(pool.size()).toBe(0);
    expect(pool.residentCount()).toBe(0);
  });

  it("drops only the failed full identity so a later open can retry", async () => {
    const app = fakeWarpApp();
    const openSidecar = vi.fn()
      .mockRejectedValueOnce(new Error("sidecar unavailable"))
      .mockResolvedValueOnce(app);
    const pool = createPool(openSidecar);
    const input = { workspace: workspace(), writerId: "graft_session_a", ownerId: "session:a" };

    await expect(pool.acquire(input)).rejects.toThrow("sidecar unavailable");
    expect(pool.residentCount()).toBe(0);
    const lease = await pool.acquire(input);
    expect(lease.app).toBe(app);

    expect(openSidecar).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
    await lease.release();
  });

  it("tracks unique source repos instead of sidecar handles in size()", async () => {
    const openSidecar = vi.fn(() => Promise.resolve(fakeWarpApp()));
    const pool = createPool(openSidecar);

    const leases = await Promise.all([
      pool.acquire({ workspace: workspace(), writerId: "graft", ownerId: "a" }),
      pool.acquire({
        workspace: workspace({ worktreeId: "worktree:b", worktreeRoot: "/fixture/b" }),
        writerId: "graft",
        ownerId: "b",
      }),
      pool.acquire({
        workspace: workspace({
          repoId: "repo:b",
          worktreeId: "worktree:c",
          worktreeRoot: "/fixture/c",
          gitCommonDir: "/fixture/c/.git",
        }),
        writerId: "graft",
        ownerId: "c",
      }),
    ]);

    expect(pool.size()).toBe(2);
    expect(pool.residentCount()).toBe(3);
    expect(openSidecar).toHaveBeenCalledTimes(3);
    await Promise.all(leases.map((lease) => lease.release()));
  });

  it("preserves a sibling writer lease when another writer fails to open", async () => {
    const openError = new Error("injected writer open failure");
    const liveApp = fakeWarpApp();
    const pool = createPool(({ writerId }) => {
      return writerId === "writer-live" ? Promise.resolve(liveApp) : Promise.reject(openError);
    });
    const live = await pool.acquire({ workspace: workspace(), writerId: "writer-live", ownerId: "session:live" });

    await expect(pool.acquire({
      workspace: workspace(),
      writerId: "writer-fail",
      ownerId: "session:fail",
    })).rejects.toBe(openError);

    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
    await live.release();
  });

  it("removes every failed caller lease when a sibling handle keeps the repo open", async () => {
    const liveApp = fakeWarpApp();
    const openError = new Error("injected writer open failure");
    const openSidecar = vi.fn(({ writerId }: WarpSidecarOpenOptions) => {
      return writerId === "writer-live" ? Promise.resolve(liveApp) : Promise.reject(openError);
    });
    const pool = createPool(openSidecar);
    const live = await pool.acquire({ workspace: workspace(), writerId: "writer-live", ownerId: "session:live" });

    const firstFailure = pool.acquire({ workspace: workspace(), writerId: "writer-fail", ownerId: "session:fail-a" });
    const secondFailure = pool.acquire({ workspace: workspace(), writerId: "writer-fail", ownerId: "session:fail-b" });

    await expect(firstFailure).rejects.toBe(openError);
    await expect(secondFailure).rejects.toBe(openError);

    expect(pool.has("repo:a", "writer-live")).toBe(true);
    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
    expect(openSidecar).toHaveBeenCalledTimes(2);
    await live.release();
  });

  it("rejects an acquisition whose graph root overlaps the source worktree without opening", async () => {
    const openSidecar = vi.fn(() => Promise.resolve(fakeWarpApp()));
    const pool = new InMemoryWarpPool({ graphRoot: "/fixture/project-a/graphs", openSidecar });

    await expect(pool.acquire({ workspace: workspace(), writerId: "graft", ownerId: "a" }))
      .rejects.toThrow("overlaps source worktree");
    expect(openSidecar).not.toHaveBeenCalled();
    expect(pool.residentCount()).toBe(0);
  });
});
