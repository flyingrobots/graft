import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ChildProcessDaemonWorkerPool } from "../../../src/mcp/daemon-worker-pool.js";
import { Metrics } from "../../../src/mcp/metrics.js";
import { DEFAULT_DAEMON_CAPABILITY_PROFILE } from "../../../src/mcp/workspace-router.js";
import { SessionTracker } from "../../../src/session/tracker.js";
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

  it("runs an offloaded repo tool on a child-process worker", async () => {
    const repoDir = createTestRepo("graft-daemon-repo-tool-");
    cleanups.push(() => {
      cleanupTestRepo(repoDir);
    });

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const pool = new ChildProcessDaemonWorkerPool({ size: 1 });
    cleanups.push(async () => {
      await pool.close();
    });

    const result = await pool.runRepoTool({
      sessionId: "session:test",
      traceId: "trace:test",
      seq: 1,
      startedAtMs: Date.now(),
      tool: "graft_map",
      args: {},
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
      graftignorePatterns: [],
      repoId: "repo:test",
      worktreeId: "worktree:test",
      gitCommonDir: path.join(repoDir, ".git"),
      capabilityProfile: DEFAULT_DAEMON_CAPABILITY_PROFILE,
      repoState: {
        checkoutEpoch: 1,
        headRef: "main",
        headSha: git(repoDir, "rev-parse HEAD").trim(),
        dirty: false,
        lastTransition: null,
        workspaceOverlay: null,
      },
      sessionSnapshot: new SessionTracker().snapshot(),
      metricsSnapshot: new Metrics().snapshot(),
    });

    const content = result.result.content[0];
    expect(content?.type).toBe("text");
    if (content?.type !== "text") {
      throw new Error("expected text content");
    }
    const payload = JSON.parse(content.text) as { summary: string; files: { path: string }[] };
    expect(payload.summary).toContain("1 files");
    expect(payload.files[0]?.path).toBe("app.ts");
    expect(result.metricsDelta.reads).toBe(0);

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
