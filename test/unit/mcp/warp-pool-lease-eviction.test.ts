import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

describe("mcp: warp pool lease eviction", () => {
  it("exposes no force-eviction escape hatch for an owned resident", async () => {
    const pool = new InMemoryWarpPool(() => {
      return Promise.resolve({ writerId: "writer-a" } as unknown as WarpApp);
    });
    const lease = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    });

    expect("eject" in pool).toBe(false);
    expect("ejectUnreferenced" in pool).toBe(false);
    expect(pool.has("repo-a", "writer-a")).toBe(true);

    await lease.release();
  });

  it("owns same-owner acquisitions with independent lease capabilities", async () => {
    const app = { writerId: "writer-a" } as unknown as WarpApp;
    const pool = new InMemoryWarpPool(() => Promise.resolve(app));
    const input = {
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    };

    const first = await pool.acquire(input);
    const second = await pool.acquire(input);

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first.key)).toBe(true);
    expect(first.app).toBe(app);
    expect(second.app).toBe(app);
    expect(pool.leaseCount("repo-a", "writer-a")).toBe(2);

    await first.release();
    await first.release();
    expect(pool.leaseCount("repo-a", "writer-a")).toBe(1);
    expect(pool.has("repo-a", "writer-a")).toBe(true);

    await second.release();
    expect(pool.leaseCount("repo-a", "writer-a")).toBe(0);
    expect(pool.has("repo-a", "writer-a")).toBe(false);
  });

  it("drops the resident automatically when its last lease releases", async () => {
    let openCount = 0;
    const pool = new InMemoryWarpPool((_worktreeRoot, writerId) => {
      openCount++;
      return Promise.resolve({ writerId, openCount } as unknown as WarpApp);
    });

    const first = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    });
    expect(pool.has("repo-a", "writer-a")).toBe(true);

    await first.release();

    expect(pool.has("repo-a", "writer-a")).toBe(false);
    const second = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-b",
    });
    expect(second.app).not.toBe(first.app);
    expect(openCount).toBe(2);
    await second.release();
  });

  it("releases one writer lane without disturbing a leased sibling lane", async () => {
    let openCount = 0;
    const fakeOpen = (_worktreeRoot: string, writerId: string) => {
      openCount++;
      return Promise.resolve({ writerId, openCount } as unknown as WarpApp);
    };
    const pool = new InMemoryWarpPool(fakeOpen);

    const live = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-live" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-live",
    });
    const dead = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-dead" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-dead",
    });

    await dead.release();
    const liveAgain = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-live" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-live-again",
    });
    const deadAgain = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-dead" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-dead-again",
    });
    expect(liveAgain.app).toBe(live.app);
    expect(deadAgain.app).not.toBe(dead.app);
    expect(openCount).toBe(3);
    await live.release();
    await liveAgain.release();
    await deadAgain.release();
  });

  it("reopens after a pending open rejects without retaining a phantom lease", async () => {
    const staleError = new Error("injected stale open failure");
    const replacementApp = { generation: "replacement" } as unknown as WarpApp;
    let rejectStale!: (error: Error) => void;
    const staleOpen = new Promise<WarpApp>((_resolve, reject) => {
      rejectStale = reject;
    });
    let openCount = 0;
    const pool = new InMemoryWarpPool(() => {
      openCount++;
      return openCount === 1 ? staleOpen : Promise.resolve(replacementApp);
    });

    const input = {
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    };
    const staleOpening = pool.acquire(input);
    const staleFailure = expect(staleOpening).rejects.toBe(staleError);

    rejectStale(staleError);
    await staleFailure;
    expect(pool.leaseCount("repo-a", "writer-a")).toBe(0);
    expect(pool.has("repo-a", "writer-a")).toBe(false);

    const replacement = await pool.acquire({ ...input, ownerId: "session-b" });
    expect(replacement.app).toBe(replacementApp);
    expect(openCount).toBe(2);
    await replacement.release();
  });

  it("tracks owned leases and evicts residents on last release", async () => {
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

    // 1. Acquire repoA and repoB
    const leaseA = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-1" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-1",
    });
    const leaseB = await pool.acquire({
      key: { repoId: "repo-b", writerId: "writer-1" },
      worktreeRoot: "/path/to/b",
      ownerId: "session-2",
    });
    expect(leaseB.app.writerId).toBe("writer-1");
    expect(pool.size()).toBe(2);
    expect(openCount).toBe(2);

    // Verify cache hit through a separately owned capability
    const leaseA2 = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-1" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-3",
    });
    expect(leaseA2.app).toBe(leaseA.app);
    expect(openCount).toBe(2);

    // 2. Each successful acquisition owns an independent lease
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(2);
    expect(pool.leaseCount("repo-b", "writer-1")).toBe(1);

    // 3. Releasing repoB's last lease evicts it and keeps repoA
    await leaseB.release();
    expect(pool.has("repo-b")).toBe(false);
    expect(pool.has("repo-a")).toBe(true);
    expect(pool.size()).toBe(1);

    // 4. Releasing one repoA capability retains the other owner
    await leaseA.release();
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(1);
    expect(pool.has("repo-a")).toBe(true);
    await leaseA2.release();
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(0);
    expect(pool.has("repo-a")).toBe(false);
    expect(pool.size()).toBe(0);

    // 5. Subsequent acquisition re-opens fresh
    const leaseA3 = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-1" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-4",
    });
    expect(leaseA3.app.graphName).toBe("graft-ast");
    expect(openCount).toBe(3);
    expect(pool.size()).toBe(1);
    await leaseA3.release();
  });
});
