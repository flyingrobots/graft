import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import { InMemoryWarpPool, resolveWarpPoolOptions } from "../../../src/mcp/warp-pool.js";

function harness(maxResidents = 2) {
  let opens = 0;
  const pool = new InMemoryWarpPool((_root, writerId) => {
    opens++;
    return Promise.resolve({ writerId, generation: opens } as unknown as WarpApp);
  }, { maxResidents });
  const acquire = (writerId: string, worktreeRoot = "/fixture") => pool.acquire({
    key: { repoId: "repo", writerId }, worktreeRoot, ownerId: "operation",
  });
  return { pool, acquire, opens: () => opens };
}

// Oracle: the packet's A, B, A, C sequence evicts B, not recently used A.
describe("WARP bounded resident LRU", () => {
  it.each(["", "0", "-1", "4.5", "65", "Infinity", "NaN", "words"])("rejects invalid configured capacity %j", (value) => {
    expect(() => resolveWarpPoolOptions({ GRAFT_WARP_MAX_RESIDENTS: value })).toThrow(RangeError);
  });

  it("defaults to four slots and accepts an explicit bounded override", async () => {
    expect(resolveWarpPoolOptions({})).toEqual({});
    expect(resolveWarpPoolOptions({ GRAFT_WARP_MAX_RESIDENTS: " 2 " })).toEqual({ maxResidents: 2 });
    const pool = new InMemoryWarpPool(() => Promise.resolve({} as WarpApp));
    const leases = await Promise.all([0, 1, 2, 3].map((i) => pool.acquire({
      key: { repoId: "repo", writerId: String(i) }, worktreeRoot: "/fixture", ownerId: "operation",
    })));
    await expect(pool.acquire({ key: { repoId: "repo", writerId: "fifth" }, worktreeRoot: "/fixture", ownerId: "operation" }))
      .rejects.toMatchObject({ code: "WARP_RESIDENT_CAPACITY", maxResidents: 4 });
    await Promise.all(leases.map((lease) => lease.release()));
  });

  it("reuses idle entries and evicts the least recently used writer lane", async () => {
    const { pool, acquire, opens } = harness();
    const a = await acquire("a");
    const appA = a.app;
    await a.release();
    const b = await acquire("b");
    await b.release();
    const again = await acquire("a");
    expect(again.app).toBe(appA);
    await again.release();
    const c = await acquire("c");
    expect(pool.has("repo", "a")).toBe(true);
    expect(pool.has("repo", "b")).toBe(false);
    expect(pool.residentCount()).toBe(2);
    expect(opens()).toBe(3);
    await c.release();
  });

  it("preserves a pinned least-recent entry and evicts an idle sibling", async () => {
    const { pool, acquire } = harness();
    const a = await acquire("a");
    const b = await acquire("b");
    await b.release();
    const c = await acquire("c");
    expect(pool.has("repo", "a")).toBe(true);
    expect(pool.has("repo", "b")).toBe(false);
    expect(pool.residentCount()).toBe(2);
    await a.release();
    await c.release();
  });

  it("makes a long-running entry recently used when its final owner releases", async () => {
    const { pool, acquire } = harness();
    const a = await acquire("a");
    const b = await acquire("b");
    await b.release();
    await a.release();
    const c = await acquire("c");
    expect(pool.has("repo", "a")).toBe(true);
    expect(pool.has("repo", "b")).toBe(false);
    await c.release();
  });

  it("refuses a new graph when all slots are pinned without calling its opener", async () => {
    const { pool, acquire, opens } = harness();
    const a = await acquire("a");
    const b = await acquire("b");
    await expect(acquire("c")).rejects.toMatchObject({ code: "WARP_RESIDENT_CAPACITY" });
    expect(opens()).toBe(2);
    expect(pool.residentCount()).toBe(2);
    const shared = await acquire("a");
    expect(shared.app).toBe(a.app);
    await shared.release();
    await a.release();
    const c = await acquire("c");
    expect(pool.has("repo", "a")).toBe(false);
    await b.release();
    await c.release();
  });

  it("reserves capacity during opening and shares that reservation", async () => {
    let finish!: (app: WarpApp) => void;
    let opens = 0;
    const app = { writerId: "a" } as WarpApp;
    const pool = new InMemoryWarpPool(() => {
      opens++;
      return new Promise<WarpApp>((resolve) => { finish = resolve; });
    }, { maxResidents: 1 });
    const input = { key: { repoId: "repo", writerId: "a" }, worktreeRoot: "/fixture", ownerId: "operation" };
    const first = pool.acquire(input);
    const shared = pool.acquire(input);
    await expect(pool.acquire({ ...input, key: { ...input.key, writerId: "b" } }))
      .rejects.toMatchObject({ code: "WARP_RESIDENT_CAPACITY" });
    expect(opens).toBe(1);
    finish(app);
    const leases = await Promise.all([first, shared]);
    expect(leases.map((lease) => lease.app)).toEqual([app, app]);
    await Promise.all(leases.map((lease) => lease.release()));
  });

  it("frees reservations after synchronous opener failure", async () => {
    const failure = new Error("controlled open failure");
    let attempts = 0;
    const app = { writerId: "a" } as WarpApp;
    const pool = new InMemoryWarpPool(() => {
      if (++attempts === 1) throw failure;
      return Promise.resolve(app);
    }, { maxResidents: 1 });
    const input = { key: { repoId: "repo", writerId: "a" }, worktreeRoot: "/fixture", ownerId: "operation" };
    await expect(pool.acquire(input)).rejects.toBe(failure);
    expect(pool.residentCount()).toBe(0);
    expect(pool.leaseCount("repo", "a")).toBe(0);
    const retry = await pool.acquire(input);
    expect(retry.app).toBe(app);
    await retry.release();
  });

  it("does not serve a released capability or decrement another owner twice", async () => {
    const { pool, acquire } = harness();
    const a = await acquire("a");
    const sibling = await acquire("a");
    await a.release();
    await a.release();
    expect(() => a.app).toThrow();
    expect(pool.leaseCount("repo", "a")).toBe(1);
    expect(sibling.app.writerId).toBe("a");
    await sibling.release();
  });

  it("reopens an idle lane through the newly resolved worktree root", async () => {
    const { acquire, opens } = harness();
    const a = await acquire("a", "/old-root");
    const oldApp = a.app;
    await a.release();
    const relocated = await acquire("a", "/new-root");
    expect(relocated.app).not.toBe(oldApp);
    expect(opens()).toBe(2);
    await relocated.release();
  });

  it("does not refresh recency when resident counts or membership are inspected", async () => {
    const { pool, acquire } = harness();
    const a = await acquire("a"); await a.release();
    const b = await acquire("b"); await b.release();
    expect(pool.has("repo", "a")).toBe(true);
    expect(pool.leaseCount("repo", "a")).toBe(0);
    expect(pool.size()).toBe(1);
    expect(pool.residentCount()).toBe(2);
    const c = await acquire("c");
    expect(pool.has("repo", "a")).toBe(false);
    expect(pool.has("repo", "b")).toBe(true);
    await c.release();
  });
});

// Exhaustive exploration boundary: all 3^5 five-access traces over three lanes.
// Independent oracle: reuse distance, rather than the implementation's Map order.
// The case number and concrete trace identify a complete deterministic replay.
const traces = Array.from({ length: 3 ** 5 }, (_, seed) => ({
  seed,
  trace: Array.from({ length: 5 }, (_, step) => String(Math.floor(seed / 3 ** step) % 3)),
}));
it.each(traces)("matches the reuse-distance oracle for trace $seed: $trace", async ({ trace }) => {
  const { pool, acquire, opens } = harness();
  let expectedOpens = 0;
  for (let step = 0; step < trace.length; step++) {
    const lane = trace[step]!;
    const prior = trace.slice(0, step).lastIndexOf(lane);
    if (prior < 0 || new Set(trace.slice(prior + 1, step)).size >= 2) expectedOpens++;
    const lease = await acquire(lane);
    expect(opens(), "graph constructions at access " + String(step)).toBe(expectedOpens);
    await lease.release();
    expect(pool.residentCount()).toBeLessThanOrEqual(2);
    expect(pool.leaseCount("repo", lane)).toBe(0);
  }
});
