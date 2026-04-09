import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ChildProcessDaemonWorkerPool } from "../../../src/mcp/daemon-worker-pool.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

describe("mcp: daemon worker pool", () => {
  it("runs monitor tick work on a child-process worker and reports worker counts", async () => {
    const repoDir = createTestRepo("graft-daemon-worker-");
    cleanups.push(() => {
      cleanupTestRepo(repoDir);
    });

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const pool = new ChildProcessDaemonWorkerPool({ size: 1 });
    cleanups.push(async () => {
      await pool.close();
    });

    const result = await pool.runMonitorTick({
      repoId: "repo:test",
      worktreeRoot: repoDir,
      writerId: "graft_test_worker",
      lastIndexedCommit: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lastIndexedCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(result.commitsIndexed).toBeGreaterThanOrEqual(1);
    }

    expect(pool.getCounts()).toEqual(expect.objectContaining({
      mode: "child_processes",
      totalWorkers: 1,
      busyWorkers: 0,
      idleWorkers: 1,
      completedTasks: 1,
      failedTasks: 0,
    }));
  });
});
