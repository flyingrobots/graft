import { describe, expect, it } from "vitest";
import { buildDaemonStatusModel, type DaemonStatusReadSnapshot } from "../../../src/cli/daemon-status-model.js";

function snapshot(overrides: Partial<DaemonStatusReadSnapshot> = {}): DaemonStatusReadSnapshot {
  return {
    status: {
      ok: true,
      sessionMode: "daemon",
      transport: "unix_socket",
      sameUserOnly: true,
      socketPath: "/tmp/graft.sock",
      mcpPath: "/mcp",
      healthPath: "/healthz",
      activeSessions: 3,
      boundSessions: 2,
      unboundSessions: 1,
      activeWarpRepos: 2,
      authorizedWorkspaces: 2,
      authorizedRepos: 1,
      workspaceBindRequiresAuthorization: true,
      defaultCapabilityProfile: {
        boundedReads: true,
        structuralTools: true,
        precisionTools: true,
        stateBookmarks: true,
        runtimeLogs: "session_local_only",
        runCapture: false,
      },
      totalMonitors: 2,
      runningMonitors: 1,
      pausedMonitors: 0,
      stoppedMonitors: 0,
      failingMonitors: 1,
      backlogMonitors: 1,
      scheduler: {
        maxConcurrentJobs: 2,
        activeJobs: 2,
        queuedJobs: 1,
        interactiveQueuedJobs: 1,
        backgroundQueuedJobs: 0,
        activeWriterLanes: 1,
        queuedWriterLanes: 1,
        completedJobs: 4,
        failedJobs: 0,
        longestQueuedWaitMs: 25,
      },
      workers: {
        mode: "child_processes",
        totalWorkers: 2,
        busyWorkers: 2,
        idleWorkers: 0,
        queuedTasks: 1,
        completedTasks: 8,
        failedTasks: 0,
      },
      startedAt: "2026-04-26T12:00:00.000Z",
    },
    sessions: {
      sessions: [
        {
          sessionId: "s-1",
          sessionMode: "daemon",
          bindState: "bound",
          repoId: "repo:1",
          worktreeId: "worktree:one",
          worktreeRoot: "/repo",
          causalSessionId: "causal:1",
          checkoutEpochId: "epoch:1",
          capabilityProfile: {
            boundedReads: true,
            structuralTools: true,
            precisionTools: true,
            stateBookmarks: true,
            runtimeLogs: "session_local_only",
            runCapture: false,
          },
          startedAt: "2026-04-26T12:00:00.000Z",
          lastActivityAt: "2026-04-26T12:02:00.000Z",
        },
      ],
    },
    currentRepo: {
      repos: [{
        repoId: "repo:1",
        gitCommonDir: "/repo/.git",
        authorizedWorkspaces: 2,
        boundSessions: 2,
        activeWorktrees: 1,
        backlogCommits: 3,
        lastBoundAt: "2026-04-26T12:01:00.000Z",
        lastActivityAt: "2026-04-26T12:02:00.000Z",
        monitor: {
          workerKind: "git_poll_indexer",
          lifecycleState: "running",
          health: "error",
          lastTickAt: "2026-04-26T12:02:00.000Z",
          lastSuccessAt: "2026-04-26T12:00:00.000Z",
          lastError: "boom",
        },
        worktrees: [{
          worktreeId: "worktree:one",
          worktreeRoot: "/repo",
          activeSessions: 2,
          lastBoundAt: "2026-04-26T12:01:00.000Z",
        }],
      }],
      filter: { cwd: "/repo" },
    },
    monitors: {
      monitors: [{
        repoId: "repo:1",
        gitCommonDir: "/repo/.git",
        anchorWorktreeRoot: "/repo",
        authorizedWorkspaces: 2,
        workerKind: "git_poll_indexer",
        lifecycleState: "running",
        health: "error",
        pollIntervalMs: 60_000,
        lastStartedAt: "2026-04-26T12:00:00.000Z",
        lastTickAt: "2026-04-26T12:02:00.000Z",
        lastSuccessAt: "2026-04-26T12:00:00.000Z",
        lastError: "boom",
        lastIndexedCommit: "abc",
        lastHeadCommit: "def",
        backlogCommits: 3,
        lastRunCommitsIndexed: 1,
        lastRunPatchesWritten: 2,
      }],
    },
    workspaceStatus: {
      sessionMode: "daemon",
      bindState: "unbound",
      repoId: null,
      worktreeId: null,
      worktreeRoot: null,
      gitCommonDir: null,
      graftDir: null,
      capabilityProfile: null,
    },
    authorizations: {
      workspaces: [
        {
          repoId: "repo:1",
          worktreeId: "worktree:one",
          worktreeRoot: "/repo",
          gitCommonDir: "/repo/.git",
          capabilityProfile: {
            boundedReads: true,
            structuralTools: true,
            precisionTools: true,
            stateBookmarks: true,
            runtimeLogs: "session_local_only",
            runCapture: false,
          },
          authorizedAt: "2026-04-26T12:00:00.000Z",
          lastBoundAt: "2026-04-26T12:01:00.000Z",
          activeSessions: 2,
        },
      ],
    },
    ...overrides,
  };
}

describe("daemon status model", () => {
  it("buildDaemonStatusModel normalizes daemon read truth before rendering", () => {
    const model = buildDaemonStatusModel({
      cwd: "/repo",
      snapshot: snapshot(),
    });

    expect(model.daemon.health).toBe("degraded");
    expect(model.daemon.socketPath).toBe("/tmp/graft.sock");
    expect(model.sessions).toMatchObject({ total: 3, bound: 2, unbound: 1, listed: 1 });
    expect(model.workspaces).toMatchObject({
      authorized: 2,
      authorizedRepos: 1,
      bound: 1,
      current: {
        cwd: "/repo",
        authorization: "authorized",
        bindState: "unbound",
        repoId: "repo:1",
        worktreeRoot: "/repo",
        activeSessions: 2,
      },
    });
    expect(model.monitors).toMatchObject({ total: 2, running: 1, failing: 1, backlog: 1, listed: 1 });
    expect(model.scheduler.pressure).toBe("queued");
    expect(model.workers.pressure).toBe("saturated");
    expect(model.degraded).toEqual(["failing_monitors", "monitor_backlog", "scheduler_queue", "worker_queue"]);
  });

  it("marks optional daemon surfaces as unknown instead of inventing symmetry", () => {
    const model = buildDaemonStatusModel({
      cwd: "/repo",
      snapshot: snapshot({
        currentRepo: undefined,
        sessions: undefined,
        monitors: undefined,
        workspaceStatus: undefined,
        authorizations: undefined,
      }),
    });

    expect(model.sessions.listed).toBe("unknown");
    expect(model.workspaces.bound).toBe("unknown");
    expect(model.workspaces.current.authorization).toBe("unknown");
    expect(model.workspaces.current.bindState).toBe("unknown");
    expect(model.monitors.listed).toBe("unknown");
  });
});
