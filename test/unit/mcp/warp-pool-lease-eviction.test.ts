import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { openWarp } from "../../../src/warp/open.js";
import { structuralLogFromGraph } from "../../../src/warp/warp-structural-log.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

describe("mcp: warp pool lease eviction", () => {
  it("exposes no force-eviction escape hatch for an owned resident", async () => {
    const pool = new InMemoryWarpPool(() => {
      return Promise.resolve({ writerId: "writer-a" } as unknown as WarpApp);
    }, { maxIdleResidents: 0, maxResidents: 64 });
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
    const pool = new InMemoryWarpPool(() => Promise.resolve(app), { maxIdleResidents: 0, maxResidents: 64 });
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
    }, { maxIdleResidents: 0, maxResidents: 64 });

    const first = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-a",
    });
    expect(pool.has("repo-a", "writer-a")).toBe(true);

    const originalApp = first.app;
    await first.release();

    expect(pool.has("repo-a", "writer-a")).toBe(false);
    const second = await pool.acquire({
      key: { repoId: "repo-a", writerId: "writer-a" },
      worktreeRoot: "/path/to/a",
      ownerId: "session-b",
    });
    expect(second.app).not.toBe(originalApp);
    expect(openCount).toBe(2);
    await second.release();
  });

  it("releases one writer lane without disturbing a leased sibling lane", async () => {
    let openCount = 0;
    const fakeOpen = (_worktreeRoot: string, writerId: string) => {
      openCount++;
      return Promise.resolve({ writerId, openCount } as unknown as WarpApp);
    };
    const pool = new InMemoryWarpPool(fakeOpen, { maxIdleResidents: 0, maxResidents: 64 });

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

    const deadApp = dead.app;
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
    expect(deadAgain.app).not.toBe(deadApp);
    expect(openCount).toBe(3);
    await live.release();
    await liveAgain.release();
    await deadAgain.release();
  });

  it.each(["last-release", "LRU pressure"] as const)("reconstructs the same bounded structural projection after %s eviction", {
    timeout: 15_000,
  }, async (policy) => {
    const repoDir = createTestRepo("graft-warp-resident-reconstruction-");
    fs.writeFileSync(
      path.join(repoDir, "app.ts"),
      "export function reconstructible(): string { return 'durable'; }\n",
    );
    git(repoDir, "add -A");
    git(repoDir, "commit -m 'add reconstructible symbol'");
    const writerId = "graft_reconstruction_test";
    let openCount = 0;
    const pool = new InMemoryWarpPool(async (worktreeRoot, requestedWriterId) => {
      openCount++;
      return openWarp({ cwd: worktreeRoot, writerId: requestedWriterId });
    }, { maxResidents: 1, maxIdleResidents: policy === "last-release" ? 0 : 1 });
    let first: Awaited<ReturnType<typeof pool.acquire>> | null = null;
    let second: Awaited<ReturnType<typeof pool.acquire>> | null = null;

    try {
      first = await pool.acquire({
        key: { repoId: "repo:reconstruction", writerId },
        worktreeRoot: repoDir,
        ownerId: "session:first",
      });
      const firstContext = { app: first.app, strandId: null };
      await indexHead({
        cwd: repoDir,
        git: nodeGit,
        pathOps: nodePathOps,
        ctx: firstContext,
      });
      const beforeEviction = await structuralLogFromGraph(firstContext, { limit: 5 });
      expect(beforeEviction).toHaveLength(1);

      await first.release();
      first = null;
      if (policy === "LRU pressure") {
        expect(pool.has("repo:reconstruction", writerId)).toBe(true);
        const pressure = await pool.acquire({
          key: { repoId: "repo:reconstruction", writerId: "graft_pressure_test" },
          worktreeRoot: repoDir,
          ownerId: "session:pressure",
        });
        await pressure.release();
      }
      expect(pool.has("repo:reconstruction", writerId)).toBe(false);

      second = await pool.acquire({
        key: { repoId: "repo:reconstruction", writerId },
        worktreeRoot: repoDir,
        ownerId: "session:second",
      });
      const afterEviction = await structuralLogFromGraph(
        { app: second.app, strandId: null },
        { limit: 5 },
      );

      expect(openCount).toBe(policy === "last-release" ? 2 : 3);
      expect(second.app).not.toBe(firstContext.app);
      expect(afterEviction).toEqual(beforeEviction);
    } finally {
      await first?.release();
      await second?.release();
      cleanupTestRepo(repoDir);
    }
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
    }, { maxIdleResidents: 0, maxResidents: 64 });

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

    const pool = new InMemoryWarpPool(fakeOpen, { maxIdleResidents: 0, maxResidents: 64 });

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
