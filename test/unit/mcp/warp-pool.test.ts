import { describe, expect, it, vi } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

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

describe("mcp: warp pool", () => {
  it("reuses the same handle for the same repo and writer lane", async () => {
    const sharedApp = fakeWarpApp();
    const openWarp = vi.fn(() => Promise.resolve(sharedApp));
    const pool = new InMemoryWarpPool(openWarp);

    const input = {
      key: { repoId: "repo:a", writerId: "graft_monitor_deadbeef" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:a",
    };
    const first = await pool.acquire(input);
    const second = await pool.acquire(input);

    expect(first.app).toBe(second.app);
    expect(openWarp).toHaveBeenCalledTimes(1);
    expect(pool.size()).toBe(1);
    await first.release();
    await second.release();
  });

  it("opens distinct handles for different writer lanes in the same repo", async () => {
    const sessionApp = fakeWarpApp();
    const monitorApp = fakeWarpApp();
    const openWarp = vi.fn()
      .mockResolvedValueOnce(sessionApp)
      .mockResolvedValueOnce(monitorApp);
    const pool = new InMemoryWarpPool(openWarp);

    const sessionResult = await pool.acquire({
      key: { repoId: "repo:a", writerId: "graft" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:a",
    });
    const monitorResult = await pool.acquire({
      key: { repoId: "repo:a", writerId: "graft_monitor_deadbeef" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "monitor:a",
    });

    expect(sessionResult.app).toBe(sessionApp);
    expect(monitorResult.app).toBe(monitorApp);
    expect(sessionResult.app).not.toBe(monitorResult.app);
    expect(openWarp).toHaveBeenCalledTimes(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(pool.size()).toBe(1);
    await sessionResult.release();
    await monitorResult.release();
  });

  it("tracks unique repos instead of open handles in size()", async () => {
    const openWarp = vi.fn(() => Promise.resolve(fakeWarpApp()));
    const pool = new InMemoryWarpPool(openWarp);

    const leases = await Promise.all([
      pool.acquire({
        key: { repoId: "repo:a", writerId: "graft" },
        worktreeRoot: "/tmp/repo-a",
        ownerId: "session:a",
      }),
      pool.acquire({
        key: { repoId: "repo:a", writerId: "graft_monitor_deadbeef" },
        worktreeRoot: "/tmp/repo-a",
        ownerId: "monitor:a",
      }),
      pool.acquire({
        key: { repoId: "repo:b", writerId: "graft" },
        worktreeRoot: "/tmp/repo-b",
        ownerId: "session:b",
      }),
    ]);

    expect(pool.size()).toBe(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(openWarp).toHaveBeenNthCalledWith(3, "/tmp/repo-b", "graft");
    await Promise.all(leases.map((lease) => lease.release()));
  });

  it("preserves a sibling writer lease when another writer fails to open", async () => {
    const openError = new Error("injected writer open failure");
    const liveApp = fakeWarpApp();
    const pool = new InMemoryWarpPool((_worktreeRoot, writerId) => {
      return writerId === "writer-live" ? Promise.resolve(liveApp) : Promise.reject(openError);
    });
    const live = await pool.acquire({
      key: { repoId: "repo:a", writerId: "writer-live" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:live",
    });

    await expect(pool.acquire({
      key: { repoId: "repo:a", writerId: "writer-fail" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:fail",
    })).rejects.toBe(openError);

    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
    await live.release();
  });

  it("removes every failed caller lease when a sibling handle keeps the repo open", async () => {
    const liveApp = fakeWarpApp();
    const openError = new Error("injected writer open failure");
    const openWarp = vi.fn((_worktreeRoot: string, writerId: string) => {
      return writerId === "writer-live" ? Promise.resolve(liveApp) : Promise.reject(openError);
    });
    const pool = new InMemoryWarpPool(openWarp);
    const live = await pool.acquire({
      key: { repoId: "repo:a", writerId: "writer-live" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:live",
    });

    const firstFailure = pool.acquire({
      key: { repoId: "repo:a", writerId: "writer-fail" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:fail-a",
    });
    const secondFailure = pool.acquire({
      key: { repoId: "repo:a", writerId: "writer-fail" },
      worktreeRoot: "/tmp/repo-a",
      ownerId: "session:fail-b",
    });

    await expect(firstFailure).rejects.toBe(openError);
    await expect(secondFailure).rejects.toBe(openError);

    expect(pool.has("repo:a", "writer-live")).toBe(true);
    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
    expect(openWarp).toHaveBeenCalledTimes(2);
    await live.release();
  });
});
