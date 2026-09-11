import { afterEach, describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { openWarp } from "../../../src/warp/open.js";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";
import { WorkspaceRouter } from "../../../src/mcp/workspace-router.js";
import { PersistedLocalHistoryStore } from "../../../src/mcp/persisted-local-history.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

// Oracle: workspace membership survives LRU pressure; only an operation owns pins.
describe("workspace residency under LRU pressure", () => {
  it("preserves both repositories' continuity when rebinding with one resident slot", {
    timeout: 15_000,
  }, async () => {
    const first = createCommittedTestRepo("graft-one-slot-first-");
    const second = createCommittedTestRepo("graft-one-slot-second-");
    cleanups.push(() => { cleanupTestRepo(first); cleanupTestRepo(second); });
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-one-slot-session-"));
    cleanups.push(() => { fs.rmSync(graftDir, { recursive: true, force: true }); });
    const pool = new InMemoryWarpPool((cwd, writerId) => openWarp({ cwd, writerId }), { maxResidents: 1 });
    const history = new PersistedLocalHistoryStore({ fs: nodeFs, codec: new CanonicalJsonCodec(), graftDir });
    const router = new WorkspaceRouter({
      mode: "repo_local", projectRoot: first, graftDir, fs: nodeFs, git: nodeGit,
      warpPool: pool, transportSessionId: "one-slot-session", warpWriterId: "one-slot-writer",
      persistedLocalHistory: history,
    });
    cleanups.push(() => router.releaseWarpLeases());
    await router.initialize();
    expect(await router.getPersistedLocalHistorySummary()).toMatchObject({ availability: "present", lastOperation: "start" });
    const previous = router.captureExecutionContext();
    try {
      expect((await router.openWorkspace({ cwd: second })).ok).toBe(true);
      expect(await router.getPersistedLocalHistorySummary()).toMatchObject({ availability: "present", lastOperation: "start" });
      expect(await router.getPersistedLocalHistorySummary(previous)).toMatchObject({
        availability: "present", lastOperation: "park", totalContinuityRecords: 2,
      });
      expect(pool.residentCount()).toBe(1);
      expect(router.listOpenedWorkspaces().workspaces).toHaveLength(2);
    } finally { await previous.releaseWarpLease(); }
  });

  it("allows more bound sessions than resident slots without pinning idle graphs", async () => {
    const repo = createCommittedTestRepo("graft-workspace-resident-lru-");
    cleanups.push(() => { cleanupTestRepo(repo); });
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "graft-resident-sessions-"));
    cleanups.push(() => { fs.rmSync(scratch, { recursive: true, force: true }); });
    let opens = 0;
    const pool = new InMemoryWarpPool((_root, writerId) => {
      opens++;
      return Promise.resolve({ writerId } as WarpApp);
    }, { maxResidents: 2 });
    const routers: WorkspaceRouter[] = [];
    for (let i = 0; i < 5; i++) {
      const graftDir = path.join(scratch, String(i));
      const history = new PersistedLocalHistoryStore({ fs: nodeFs, codec: new CanonicalJsonCodec(), graftDir });
      history.noteBinding = ({ currentGraph }) => {
        expect(currentGraph?.warp.app.writerId).toBe("writer-" + String(i));
        return Promise.resolve();
      };
      const router = new WorkspaceRouter({
        mode: "repo_local", projectRoot: repo, graftDir, fs: nodeFs, git: nodeGit,
        warpPool: pool, transportSessionId: "session-" + String(i), warpWriterId: "writer-" + String(i),
        persistedLocalHistory: history,
      });
      routers.push(router);
      cleanups.push(() => router.releaseWarpLeases());
      await router.initialize();
      const execution = router.captureExecutionContext();
      try {
        expect((await execution.getWarp()).app.writerId).toBe("writer-" + String(i));
      } finally { await execution.releaseWarpLease(); }
      expect(pool.leaseCount(execution.repoId, execution.warpWriterId)).toBe(0);
      expect(pool.residentCount()).toBeLessThanOrEqual(2);
    }
    expect(routers.map((router) => router.getStatus().bindState)).toEqual(Array(5).fill("bound"));
    expect(routers.map((router) => router.listOpenedWorkspaces().workspaces.length)).toEqual(Array(5).fill(1));
    const revisit = routers[0]!.captureExecutionContext();
    try { expect((await revisit.getWarp()).app.writerId).toBe("writer-0"); }
    finally { await revisit.releaseWarpLease(); }
    expect(opens).toBe(6);
    expect(pool.residentCount()).toBe(2);
  });
});
