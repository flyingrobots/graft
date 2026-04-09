import { describe, expect, it, vi } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

describe("mcp: warp pool", () => {
  it("reuses the same handle for the same repo and writer lane", async () => {
    const openWarp = vi.fn(() => Promise.resolve(({}) as WarpApp));
    const pool = new InMemoryWarpPool(openWarp);

    const first = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    const second = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(first).toBe(second);
    expect(openWarp).toHaveBeenCalledTimes(1);
    expect(pool.size()).toBe(1);
  });

  it("opens distinct handles for different writer lanes in the same repo", async () => {
    const openWarp = vi.fn((_cwd: string, writerId: string) => {
      return Promise.resolve(({ writerId }) as unknown as WarpApp);
    });
    const pool = new InMemoryWarpPool(openWarp);

    const sessionWarp = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    const monitorWarp = await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");

    expect(sessionWarp).not.toBe(monitorWarp);
    expect(openWarp).toHaveBeenCalledTimes(2);
    expect(pool.size()).toBe(1);
  });

  it("tracks unique repos instead of open handles in size()", async () => {
    const openWarp = vi.fn((_cwd: string, writerId: string) => {
      return Promise.resolve(({ writerId }) as unknown as WarpApp);
    });
    const pool = new InMemoryWarpPool(openWarp);

    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft");
    await pool.getOrOpen("repo:a", "/tmp/repo-a", "graft_monitor_deadbeef");
    await pool.getOrOpen("repo:b", "/tmp/repo-b", "graft");

    expect(pool.size()).toBe(2);
  });
});
