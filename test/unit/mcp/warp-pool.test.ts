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

    const first = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    const second = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(first).toBe(second);
    expect(openWarp).toHaveBeenCalledTimes(1);
    expect(pool.size()).toBe(1);
  });

  it("opens distinct handles for different writer lanes in the same repo", async () => {
    const sessionApp = fakeWarpApp();
    const monitorApp = fakeWarpApp();
    const openWarp = vi.fn()
      .mockResolvedValueOnce(sessionApp)
      .mockResolvedValueOnce(monitorApp);
    const pool = new InMemoryWarpPool(openWarp);

    const sessionResult = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    const monitorResult = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(sessionResult).toBe(sessionApp);
    expect(monitorResult).toBe(monitorApp);
    expect(sessionResult).not.toBe(monitorResult);
    expect(openWarp).toHaveBeenCalledTimes(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(pool.size()).toBe(1);
  });

  it("tracks unique repos instead of open handles in size()", async () => {
    const openWarp = vi.fn(() => Promise.resolve(fakeWarpApp()));
    const pool = new InMemoryWarpPool(openWarp);

    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    await pool.getOrOpen("repo:b", "/tmp/repo-b", "graft");

    expect(pool.size()).toBe(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(openWarp).toHaveBeenNthCalledWith(3, "/tmp/repo-b", "graft");
  });

  it("preserves a sibling writer lease when another writer fails to open", async () => {
    const openError = new Error("injected writer open failure");
    const pool = new InMemoryWarpPool(() => Promise.reject(openError));
    pool.acquireLease("repo:a", "writer-live", "session:live");

    await expect(pool.getOrOpen(
      "repo:a",
      "/tmp/repo-a",
      "writer-fail",
      "session:fail",
    )).rejects.toBe(openError);

    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
  });

  it("removes every failed caller lease when a sibling handle keeps the repo open", async () => {
    const liveApp = fakeWarpApp();
    const openError = new Error("injected writer open failure");
    const openWarp = vi.fn((_worktreeRoot: string, writerId: string) => {
      return writerId === "writer-live" ? Promise.resolve(liveApp) : Promise.reject(openError);
    });
    const pool = new InMemoryWarpPool(openWarp);
    await pool.getOrOpen("repo:a", "/tmp/repo-a", "writer-live", "session:live");

    const firstFailure = pool.getOrOpen(
      "repo:a",
      "/tmp/repo-a",
      "writer-fail",
      "session:fail-a",
    );
    const secondFailure = pool.getOrOpen(
      "repo:a",
      "/tmp/repo-a",
      "writer-fail",
      "session:fail-b",
    );

    await expect(firstFailure).rejects.toBe(openError);
    await expect(secondFailure).rejects.toBe(openError);

    expect(pool.has("repo:a", "writer-live")).toBe(true);
    expect(pool.leaseCount("repo:a", "writer-live")).toBe(1);
    expect(pool.leaseCount("repo:a", "writer-fail")).toBe(0);
    expect(openWarp).toHaveBeenCalledTimes(2);
  });
});
