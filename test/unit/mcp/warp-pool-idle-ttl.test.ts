/**
 * Idle residents must age out on a clock, not only under capacity pressure.
 *
 * A WarpApp is the whole in-memory controller for one repository's CRDT
 * graph. The pool bounds how many exist but, without a TTL, a resident that
 * grew for a week stays warm forever, and evicting it only unlinks the map
 * entry — nothing disposes the graph.
 */

import { describe, expect, it, vi } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool, resolveWarpPoolOptions } from "../../../src/mcp/warp-pool.js";

interface FakeApp {
  readonly writerId: string;
  closed: boolean;
}

/** A pool driven by a hand-advanced clock so idleness is deterministic. */
function harness(options: {
  maxResidents?: number;
  maxIdleResidents?: number;
  idleTtlMs?: number;
  close?: (app: FakeApp) => Promise<void>;
} = {}) {
  let now = 1_000;
  const opened: FakeApp[] = [];
  const pool = new InMemoryWarpPool(
    (_root, writerId) => {
      const app: FakeApp = { writerId, closed: false };
      opened.push(app);
      return Promise.resolve(app as unknown as WarpApp);
    },
    {
      ...options,
      now: () => now,
      close: options.close
        ? (app: WarpApp) => options.close!(app as unknown as FakeApp)
        : (app: WarpApp) => {
          (app as unknown as FakeApp).closed = true;
          return Promise.resolve();
        },
    },
  );
  return {
    pool,
    opened,
    advance: (ms: number) => { now += ms; },
    acquire: (writerId: string, worktreeRoot = "/fixture") => pool.acquire({
      key: { repoId: "repo", writerId },
      worktreeRoot,
      ownerId: "operation",
    }),
  };
}

describe("WARP resident idle TTL", () => {
  it("evicts a resident idle beyond the TTL without any capacity pressure", async () => {
    const { pool, acquire, advance } = harness({ maxResidents: 4, idleTtlMs: 600_000 });
    const lease = await acquire("a");
    await lease.release();
    expect(pool.residentCount()).toBe(1);

    advance(600_001);
    await pool.sweepIdle();

    expect(pool.residentCount()).toBe(0);
  });

  it("keeps a resident that has not yet reached the TTL", async () => {
    const { pool, acquire, advance } = harness({ maxResidents: 4, idleTtlMs: 600_000 });
    const lease = await acquire("a");
    await lease.release();

    advance(599_999);
    await pool.sweepIdle();

    expect(pool.residentCount()).toBe(1);
  });

  it("never evicts a resident that is still pinned, however old", async () => {
    const { pool, acquire, advance } = harness({ maxResidents: 4, idleTtlMs: 1_000 });
    const lease = await acquire("a");

    advance(10_000_000);
    await pool.sweepIdle();

    expect(pool.residentCount()).toBe(1);
    await lease.release();
  });

  it("restarts the idle clock when a resident is reacquired", async () => {
    const { pool, acquire, advance } = harness({ maxResidents: 4, idleTtlMs: 600_000 });
    const first = await acquire("a");
    await first.release();

    advance(599_000);
    const second = await acquire("a");
    await second.release();
    advance(599_000);
    await pool.sweepIdle();

    expect(pool.residentCount()).toBe(1);
  });

  it("disposes the evicted graph so it can be collected", async () => {
    const { pool, acquire, advance, opened } = harness({ maxResidents: 4, idleTtlMs: 600_000 });
    const lease = await acquire("a");
    await lease.release();

    advance(600_001);
    await pool.sweepIdle();

    expect(opened[0]?.closed).toBe(true);
  });

  it("disposes a resident evicted for capacity, not only for idleness", async () => {
    const { pool, acquire, opened } = harness({ maxResidents: 1, idleTtlMs: 600_000 });
    const first = await acquire("a");
    await first.release();
    const second = await acquire("b");
    await second.release();

    expect(pool.residentCount()).toBe(1);
    expect(opened[0]?.closed).toBe(true);
  });

  it("still evicts when disposal rejects", async () => {
    const { pool, acquire, advance } = harness({
      maxResidents: 4,
      idleTtlMs: 600_000,
      close: () => Promise.reject(new Error("close failed")),
    });
    const lease = await acquire("a");
    await lease.release();

    advance(600_001);
    await expect(pool.sweepIdle()).resolves.not.toThrow();

    expect(pool.residentCount()).toBe(0);
  });

  it("opens a fresh graph after the idle one was swept", async () => {
    const { pool, acquire, advance, opened } = harness({ maxResidents: 4, idleTtlMs: 600_000 });
    const first = await acquire("a");
    const firstApp = first.app;
    await first.release();

    advance(600_001);
    await pool.sweepIdle();
    const second = await acquire("a");

    expect(second.app).not.toBe(firstApp);
    expect(opened).toHaveLength(2);
    await second.release();
  });

  it("sweeps on an interval once started, and stops cleanly", async () => {
    vi.useFakeTimers();
    try {
      const pool = new InMemoryWarpPool(
        () => Promise.resolve({} as WarpApp),
        { idleTtlMs: 1_000, now: () => Date.now() },
      );
      const lease = await pool.acquire({
        key: { repoId: "repo", writerId: "a" }, worktreeRoot: "/fixture", ownerId: "operation",
      });
      await lease.release();

      const stop = pool.startIdleSweeper();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(pool.residentCount()).toBe(0);

      stop();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("WARP resident idle configuration", () => {
  it("reads the idle TTL and idle cap from the environment", () => {
    expect(resolveWarpPoolOptions({ GRAFT_WARP_IDLE_TTL_MS: "60000" }))
      .toMatchObject({ idleTtlMs: 60_000 });
    expect(resolveWarpPoolOptions({ GRAFT_WARP_MAX_IDLE_RESIDENTS: "0" }))
      .toMatchObject({ maxIdleResidents: 0 });
  });

  it("rejects an unparseable or negative idle TTL rather than silently defaulting", () => {
    for (const value of ["", "-1", "1.5", "words", "Infinity"]) {
      expect(() => resolveWarpPoolOptions({ GRAFT_WARP_IDLE_TTL_MS: value })).toThrow(RangeError);
    }
  });

  it("rejects an idle cap above the resident cap", () => {
    expect(() => resolveWarpPoolOptions({
      GRAFT_WARP_MAX_RESIDENTS: "2",
      GRAFT_WARP_MAX_IDLE_RESIDENTS: "3",
    })).toThrow(RangeError);
  });

  // No assertion that idle residents are trimmed by count on release: idle
  // entries competing by recency is the pool's deliberate LRU behavior (PR
  // #251), pinned by warp-pool-lru.test.ts. Lifetime is bounded by the idle
  // TTL above, which is the ratchet that mattered.
});
