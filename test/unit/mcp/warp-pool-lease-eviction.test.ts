import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

describe("mcp: warp pool lease eviction", () => {
  it("drops the resident automatically when its last lease releases", async () => {
    let openCount = 0;
    const pool = new InMemoryWarpPool((_worktreeRoot, writerId) => {
      openCount++;
      return Promise.resolve({ writerId, openCount } as unknown as WarpApp);
    });

    const first = await pool.getOrOpen(
      "repo-a",
      "/path/to/a",
      "writer-a",
      "session-a",
    );
    expect(pool.has("repo-a", "writer-a")).toBe(true);

    pool.releaseLease("repo-a", "writer-a", "session-a");

    expect(pool.has("repo-a", "writer-a")).toBe(false);
    expect(await pool.getOrOpen(
      "repo-a",
      "/path/to/a",
      "writer-a",
      "session-b",
    )).not.toBe(first);
    expect(openCount).toBe(2);
  });

  it("ejects an unreferenced writer lane without disturbing a leased sibling lane", async () => {
    let openCount = 0;
    const fakeOpen = (_worktreeRoot: string, writerId: string) => {
      openCount++;
      return Promise.resolve({ writerId, openCount } as unknown as WarpApp);
    };
    const pool = new InMemoryWarpPool(fakeOpen);

    const live = await pool.getOrOpen(
      "repo-a",
      "/path/to/a",
      "writer-live",
      "session-live",
    );
    const dead = await pool.getOrOpen("repo-a", "/path/to/a", "writer-dead");

    expect(await pool.ejectUnreferenced()).toBe(1);
    expect(await pool.getOrOpen(
      "repo-a",
      "/path/to/a",
      "writer-live",
      "session-live",
    )).toBe(live);
    expect(await pool.getOrOpen("repo-a", "/path/to/a", "writer-dead")).not.toBe(dead);
    expect(openCount).toBe(3);
  });

  it("tracks leases and ejects unreferenced WarpApp instances", async () => {
    let openCount = 0;
    const fakeOpen = (worktreeRoot: string, writerId: string) => {
      openCount++;
      return Promise.resolve({
        graphName: "graft-ast",
        writerId,
        worktreeRoot,
      } as unknown as WarpApp);
    };

    const pool = new InMemoryWarpPool(fakeOpen);

    // 1. Open repoA and repoB
    const appA = await pool.getOrOpen("repo-a", "/path/to/a", "writer-1");
    const appB = await pool.getOrOpen("repo-b", "/path/to/b", "writer-1");
    expect(appB.writerId).toBe("writer-1");
    expect(pool.size()).toBe(2);
    expect(openCount).toBe(2);

    // Verify cache hit
    const appA2 = await pool.getOrOpen("repo-a", "/path/to/a", "writer-1");
    expect(appA2).toBe(appA);
    expect(openCount).toBe(2);

    // 2. Acquire leases for session 1 on repoA
    pool.acquireLease("repo-a", "writer-1", "session-1");
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(1);
    expect(pool.leaseCount("repo-b", "writer-1")).toBe(0);

    // 3. Ejecting repoA while it has an active lease should be rejected
    const ejectedA = await pool.eject("repo-a", "writer-1");
    expect(ejectedA).toBe(false);
    expect(pool.has("repo-a")).toBe(true);

    // 4. Eject unreferenced should eject repoB (0 leases) and keep repoA (1 lease)
    const count = await pool.ejectUnreferenced();
    expect(count).toBe(1);
    expect(pool.has("repo-b")).toBe(false);
    expect(pool.has("repo-a")).toBe(true);
    expect(pool.size()).toBe(1);

    // 5. Release lease on repoA
    pool.releaseLease("repo-a", "writer-1", "session-1");
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(0);
    expect(pool.has("repo-a")).toBe(false);
    expect(pool.size()).toBe(0);

    // 6. No explicit sweep remains necessary after the last release
    const count2 = await pool.ejectUnreferenced();
    expect(count2).toBe(0);
    expect(pool.has("repo-a")).toBe(false);
    expect(pool.size()).toBe(0);

    // 7. Subsequent getOrOpen re-opens fresh
    const appA3 = await pool.getOrOpen("repo-a", "/path/to/a", "writer-1");
    expect(appA3.graphName).toBe("graft-ast");
    expect(openCount).toBe(3);
    expect(pool.size()).toBe(1);
  });
});
