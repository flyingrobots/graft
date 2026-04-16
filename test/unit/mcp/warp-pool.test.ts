import { describe, expect, it, vi } from "vitest";
import type { WarpHandle } from "../../../src/ports/warp.js";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

function fakeWarpHandle(): WarpHandle {
  return {
    hasNode: vi.fn(() => Promise.resolve(false)),
    observer: vi.fn(() => Promise.resolve({
      getNodes: () => Promise.resolve([]),
      getNodeProps: () => Promise.resolve(null),
      getEdges: () => Promise.resolve([]),
    })),
    patch: vi.fn(() => Promise.resolve("patch:test")),
    materialize: vi.fn(() => Promise.resolve()),
    materializeReceipts: vi.fn(() => Promise.resolve([])),
  };
}

describe("mcp: warp pool", () => {
  it("reuses the same handle for the same repo and writer lane", async () => {
    const sharedWarp = fakeWarpHandle();
    const openWarp = vi.fn(() => Promise.resolve(sharedWarp));
    const pool = new InMemoryWarpPool(openWarp);

    const first = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    const second = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(first).toBe(second);
    expect(openWarp).toHaveBeenCalledTimes(1);
    expect(pool.size()).toBe(1);
  });

  it("opens distinct handles for different writer lanes in the same repo", async () => {
    const sessionWarp = fakeWarpHandle();
    const monitorWarp = fakeWarpHandle();
    const openWarp = vi.fn()
      .mockResolvedValueOnce(sessionWarp)
      .mockResolvedValueOnce(monitorWarp);
    const pool = new InMemoryWarpPool(openWarp);

    const sessionHandle = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    const monitorHandle = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(sessionHandle).toBe(sessionWarp);
    expect(monitorHandle).toBe(monitorWarp);
    expect(sessionHandle).not.toBe(monitorHandle);
    expect(openWarp).toHaveBeenCalledTimes(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(pool.size()).toBe(1);
  });

  it("tracks unique repos instead of open handles in size()", async () => {
    const openWarp = vi.fn(() => Promise.resolve(fakeWarpHandle()));
    const pool = new InMemoryWarpPool(openWarp);

    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    await pool.getOrOpen("repo:b", "/tmp/repo-b", "graft");

    expect(pool.size()).toBe(2);
    expect(openWarp).toHaveBeenNthCalledWith(1, "/tmp/repo-a", "graft");
    expect(openWarp).toHaveBeenNthCalledWith(2, "/tmp/repo-a", "graft_monitor_deadbeef");
    expect(openWarp).toHaveBeenNthCalledWith(3, "/tmp/repo-b", "graft");
  });
});
