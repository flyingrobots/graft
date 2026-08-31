import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";

describe("mcp: warp pool lease eviction", () => {
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

  it("ejects an unreferenced writer lane without disturbing a leased sibling lane", async () => {
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

  it("keeps a replacement resident when an evicted pending open rejects late", async () => {
    const staleError = new Error("injected stale open failure");
    const replacementApp = { generation: "replacement" } as unknown as WarpApp;
    let rejectStale!: (error: Error) => void;
    let resolveReplacement!: (app: WarpApp) => void;
    const staleOpen = new Promise<WarpApp>((_resolve, reject) => {
      rejectStale = reject;
    });
    const replacementOpen = new Promise<WarpApp>((resolve) => {
      resolveReplacement = resolve;
    });
    let openCount = 0;
    const pool = new InMemoryWarpPool(() => {
      openCount++;
      return openCount === 1 ? staleOpen : replacementOpen;
    });

    const input = {
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    };
    const staleOpening = pool.acquire(input);
    const staleFailure = expect(staleOpening).rejects.toBe(staleError);
    expect(await pool.eject("repo-a", "writer-a", true)).toBe(true);

    const replacementOpening = pool.acquire({ ...input, ownerId: "session-b" });
    resolveReplacement(replacementApp);
    const replacement = await replacementOpening;
    expect(replacement.app).toBe(replacementApp);

    rejectStale(staleError);
    await staleFailure;

    expect(pool.has("repo-a", "writer-a")).toBe(true);
    const observed = await pool.acquire({ ...input, ownerId: "session-c" });
    expect(observed.app).toBe(replacementApp);
    expect(openCount).toBe(2);
    await replacement.release();
    await observed.release();
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

    // 3. Ejecting repoA while it has an active lease should be rejected
    const ejectedA = await pool.eject("repo-a", "writer-1");
    expect(ejectedA).toBe(false);
    expect(pool.has("repo-a")).toBe(true);

    // 4. Releasing repoB's last lease evicts it and keeps repoA
    await leaseB.release();
    expect(pool.has("repo-b")).toBe(false);
    expect(pool.has("repo-a")).toBe(true);
    expect(pool.size()).toBe(1);

    // 5. Releasing one repoA capability retains the other owner
    await leaseA.release();
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(1);
    expect(pool.has("repo-a")).toBe(true);
    await leaseA2.release();
    expect(pool.leaseCount("repo-a", "writer-1")).toBe(0);
    expect(pool.has("repo-a")).toBe(false);
    expect(pool.size()).toBe(0);

    // 6. No explicit sweep remains necessary after the last release
    const count2 = await pool.ejectUnreferenced();
    expect(count2).toBe(0);
    expect(pool.has("repo-a")).toBe(false);
    expect(pool.size()).toBe(0);

    // 7. Subsequent acquisition re-opens fresh
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
