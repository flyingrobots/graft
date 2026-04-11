import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createDaemonServer() {
  const isolated = createIsolatedServer({ mode: "daemon" });
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}

function createCommittedRepo(): string {
  const repoDir = createTestRepo("graft-monitor-");
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
  git(repoDir, "add -A");
  git(repoDir, "commit -m init");
  return repoDir;
}

describe("mcp: persistent monitors", () => {
  it("Do background monitors run through the same pressure and fairness scheduler as foreground repo work?", async () => {
    const repoDir = createCommittedRepo();
    const server = createDaemonServer();

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_bind", { cwd: repoDir });

    const initialStatus = parse(await server.callTool("daemon_status", {}));
    expect(initialStatus["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 0,
      backgroundQueuedJobs: 0,
    }));

    await server.callTool("safe_read", { path: "app.ts" });

    const afterForeground = parse(await server.callTool("daemon_status", {}));
    expect(afterForeground["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 1,
      backgroundQueuedJobs: 0,
      activeJobs: 0,
    }));

    const start = parse(await server.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 60_000,
    }));
    expect(start["ok"]).toBe(true);
    expect(start["action"]).toBe("start");
    expect(start["status"]).toEqual(expect.objectContaining({
      repoId: expect.any(String),
      lifecycleState: "running",
      workerKind: "git_poll_indexer",
    }));

    const listed = parse(await server.callTool("daemon_monitors", {}));
    expect(listed["monitors"]).toEqual([
      expect.objectContaining({
        repoId: start["status"] && (start["status"] as { repoId: string }).repoId,
        lifecycleState: "running",
        authorizedWorkspaces: 1,
      }),
    ]);

    const runningStatus = parse(await server.callTool("daemon_status", {}));
    expect(runningStatus).toEqual(expect.objectContaining({
      totalMonitors: 1,
      runningMonitors: 1,
      pausedMonitors: 0,
      stoppedMonitors: 0,
    }));
    expect(runningStatus["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 2,
      backgroundQueuedJobs: 0,
      activeJobs: 0,
    }));

    const pause = parse(await server.callTool("monitor_pause", { cwd: repoDir }));
    expect(pause["ok"]).toBe(true);
    expect(pause["status"]).toEqual(expect.objectContaining({
      lifecycleState: "paused",
      health: "paused",
    }));

    const resume = parse(await server.callTool("monitor_resume", { cwd: repoDir }));
    expect(resume["ok"]).toBe(true);
    expect(resume["status"]).toEqual(expect.objectContaining({
      lifecycleState: "running",
    }));

    const resumedStatus = parse(await server.callTool("daemon_status", {}));
    expect(resumedStatus["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 3,
      backgroundQueuedJobs: 0,
      activeJobs: 0,
    }));

    const stop = parse(await server.callTool("monitor_stop", { cwd: repoDir }));
    expect(stop["ok"]).toBe(true);
    expect(stop["status"]).toEqual(expect.objectContaining({
      lifecycleState: "stopped",
      health: "stopped",
    }));

    const stoppedStatus = parse(await server.callTool("daemon_status", {}));
    expect(stoppedStatus).toEqual(expect.objectContaining({
      totalMonitors: 1,
      runningMonitors: 0,
      pausedMonitors: 0,
      stoppedMonitors: 1,
    }));
  });

  it("keeps monitor control behind authorized workspaces and one monitor per repo", async () => {
    const repoDir = createCommittedRepo();
    git(repoDir, "branch secondary");
    const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-monitor-worktree-"));
    git(repoDir, `worktree add ${worktreeDir} secondary`);
    cleanups.push(() => {
      fs.rmSync(worktreeDir, { recursive: true, force: true });
    });

    const server = createDaemonServer();

    const denied = parse(await server.callTool("monitor_start", { cwd: repoDir }));
    expect(denied["ok"]).toBe(false);
    expect(denied["errorCode"]).toBe("WORKSPACE_NOT_AUTHORIZED");

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_authorize", { cwd: worktreeDir });
    const firstStart = parse(await server.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 60_000,
    }));
    const secondStart = parse(await server.callTool("monitor_start", {
      cwd: worktreeDir,
      pollIntervalMs: 60_000,
    }));

    expect(firstStart["ok"]).toBe(true);
    expect(secondStart["ok"]).toBe(true);

    const listed = parse(await server.callTool("daemon_monitors", {}));
    expect(listed["monitors"]).toEqual([
      expect.objectContaining({
        repoId: (firstStart["status"] as { repoId: string }).repoId,
        authorizedWorkspaces: 2,
      }),
    ]);

    await server.callTool("monitor_stop", { cwd: repoDir });
  });
});
