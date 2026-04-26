import * as path from "node:path";
import { type z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";

export type DaemonStatusPayload = z.output<typeof mcpOutputBodySchemas.daemon_status>;
export type DaemonSessionsPayload = z.output<typeof mcpOutputBodySchemas.daemon_sessions>;
export type DaemonReposPayload = z.output<typeof mcpOutputBodySchemas.daemon_repos>;
export type DaemonMonitorsPayload = z.output<typeof mcpOutputBodySchemas.daemon_monitors>;
export type WorkspaceStatusPayload = z.output<typeof mcpOutputBodySchemas.workspace_status>;
export type WorkspaceAuthorizationsPayload = z.output<typeof mcpOutputBodySchemas.workspace_authorizations>;

export interface DaemonStatusReadSnapshot {
  readonly status: DaemonStatusPayload;
  readonly sessions?: DaemonSessionsPayload | undefined;
  readonly currentRepo?: DaemonReposPayload | undefined;
  readonly monitors?: DaemonMonitorsPayload | undefined;
  readonly workspaceStatus?: WorkspaceStatusPayload | undefined;
  readonly authorizations?: WorkspaceAuthorizationsPayload | undefined;
}

export type UnknownCount = number | "unknown";
export type DaemonHealth = "ok" | "degraded";
export type DaemonCurrentAuthorization = "authorized" | "not_authorized" | "unknown";
export type DaemonCurrentBindState = "bound" | "unbound" | "unknown";
export type DaemonSchedulerPressure = "idle" | "running" | "queued" | "saturated";
export type DaemonWorkerPressure = "idle" | "busy" | "saturated" | "unknown";

export interface DaemonStatusModel {
  readonly command: "daemon_status";
  readonly cwd: string;
  readonly daemon: {
    readonly health: DaemonHealth;
    readonly transport: DaemonStatusPayload["transport"];
    readonly socketPath: string;
    readonly mcpPath: string;
    readonly healthPath: string;
    readonly startedAt: string;
    readonly sameUserOnly: true;
    readonly activeWarpRepos: number;
  };
  readonly sessions: {
    readonly total: number;
    readonly bound: number;
    readonly unbound: number;
    readonly listed: UnknownCount;
  };
  readonly workspaces: {
    readonly authorized: number;
    readonly authorizedRepos: number;
    readonly bound: UnknownCount;
    readonly current: {
      readonly cwd: string;
      readonly authorization: DaemonCurrentAuthorization;
      readonly bindState: DaemonCurrentBindState;
      readonly repoId: string | null;
      readonly worktreeRoot: string | null;
      readonly activeSessions: number | null;
    };
  };
  readonly monitors: {
    readonly total: number;
    readonly running: number;
    readonly paused: number;
    readonly stopped: number;
    readonly failing: number;
    readonly backlog: number;
    readonly listed: UnknownCount;
  };
  readonly scheduler: {
    readonly maxConcurrentJobs: number;
    readonly activeJobs: number;
    readonly queuedJobs: number;
    readonly interactiveQueuedJobs: number;
    readonly backgroundQueuedJobs: number;
    readonly longestQueuedWaitMs: number;
    readonly pressure: DaemonSchedulerPressure;
  };
  readonly workers: {
    readonly mode: DaemonStatusPayload["workers"]["mode"];
    readonly totalWorkers: number;
    readonly busyWorkers: number;
    readonly idleWorkers: number;
    readonly queuedTasks: number;
    readonly pressure: DaemonWorkerPressure;
  };
  readonly degraded: readonly string[];
}

interface CurrentWorkspacePosture {
  readonly authorization: DaemonCurrentAuthorization;
  readonly repoId: string | null;
  readonly worktreeRoot: string | null;
  readonly activeSessions: number | null;
}

function normalizePath(value: string): string {
  return path.resolve(value);
}

function schedulerPressure(status: DaemonStatusPayload): DaemonSchedulerPressure {
  if (status.scheduler.queuedJobs > 0) return "queued";
  if (status.scheduler.activeJobs >= status.scheduler.maxConcurrentJobs) return "saturated";
  if (status.scheduler.activeJobs > 0) return "running";
  return "idle";
}

function workerPressure(status: DaemonStatusPayload): DaemonWorkerPressure {
  if (status.workers.totalWorkers === 0) return "unknown";
  if (status.workers.queuedTasks > 0 || status.workers.busyWorkers >= status.workers.totalWorkers) {
    return "saturated";
  }
  if (status.workers.busyWorkers > 0) return "busy";
  return "idle";
}

function buildDegradedReasons(status: DaemonStatusPayload): string[] {
  const reasons: string[] = [];
  if (status.failingMonitors > 0) reasons.push("failing_monitors");
  if (status.backlogMonitors > 0) reasons.push("monitor_backlog");
  if (status.scheduler.queuedJobs > 0) reasons.push("scheduler_queue");
  if (status.scheduler.failedJobs > 0) reasons.push("scheduler_failures");
  if (status.workers.queuedTasks > 0) reasons.push("worker_queue");
  if (status.workers.failedTasks > 0) reasons.push("worker_failures");
  return reasons;
}

function currentPosture(
  cwd: string,
  snapshot: DaemonStatusReadSnapshot,
): CurrentWorkspacePosture {
  const normalizedCwd = normalizePath(cwd);
  const currentRepo = snapshot.currentRepo?.repos[0];
  const currentWorktree = currentRepo?.worktrees.find((worktree) => {
    return normalizePath(worktree.worktreeRoot) === normalizedCwd;
  }) ?? currentRepo?.worktrees[0];

  const exactAuthorization = snapshot.authorizations?.workspaces.find((workspace) => {
    return normalizePath(workspace.worktreeRoot) === normalizedCwd;
  });

  if (currentRepo !== undefined || exactAuthorization !== undefined) {
    return {
      authorization: "authorized",
      repoId: currentRepo?.repoId ?? exactAuthorization?.repoId ?? null,
      worktreeRoot: currentWorktree?.worktreeRoot ?? exactAuthorization?.worktreeRoot ?? null,
      activeSessions: currentWorktree?.activeSessions ?? exactAuthorization?.activeSessions ?? null,
    };
  }

  if (snapshot.authorizations !== undefined || snapshot.currentRepo !== undefined) {
    return {
      authorization: "not_authorized",
      repoId: null,
      worktreeRoot: null,
      activeSessions: null,
    };
  }

  return {
    authorization: "unknown",
    repoId: null,
    worktreeRoot: null,
    activeSessions: null,
  };
}

export function buildDaemonStatusModel(input: {
  readonly cwd: string;
  readonly snapshot: DaemonStatusReadSnapshot;
}): DaemonStatusModel {
  const { cwd, snapshot } = input;
  const { status } = snapshot;
  const degraded = buildDegradedReasons(status);
  const current = currentPosture(cwd, snapshot);

  return {
    command: "daemon_status",
    cwd,
    daemon: {
      health: degraded.length === 0 ? "ok" : "degraded",
      transport: status.transport,
      socketPath: status.socketPath,
      mcpPath: status.mcpPath,
      healthPath: status.healthPath,
      startedAt: status.startedAt,
      sameUserOnly: status.sameUserOnly,
      activeWarpRepos: status.activeWarpRepos,
    },
    sessions: {
      total: status.activeSessions,
      bound: status.boundSessions,
      unbound: status.unboundSessions,
      listed: snapshot.sessions?.sessions.length ?? "unknown",
    },
    workspaces: {
      authorized: status.authorizedWorkspaces,
      authorizedRepos: status.authorizedRepos,
      bound: snapshot.authorizations === undefined
        ? "unknown"
        : snapshot.authorizations.workspaces.filter((workspace) => workspace.activeSessions > 0).length,
      current: {
        cwd,
        authorization: current.authorization,
        bindState: snapshot.workspaceStatus?.bindState ?? "unknown",
        repoId: current.repoId,
        worktreeRoot: current.worktreeRoot,
        activeSessions: current.activeSessions,
      },
    },
    monitors: {
      total: status.totalMonitors,
      running: status.runningMonitors,
      paused: status.pausedMonitors,
      stopped: status.stoppedMonitors,
      failing: status.failingMonitors,
      backlog: status.backlogMonitors,
      listed: snapshot.monitors?.monitors.length ?? "unknown",
    },
    scheduler: {
      maxConcurrentJobs: status.scheduler.maxConcurrentJobs,
      activeJobs: status.scheduler.activeJobs,
      queuedJobs: status.scheduler.queuedJobs,
      interactiveQueuedJobs: status.scheduler.interactiveQueuedJobs,
      backgroundQueuedJobs: status.scheduler.backgroundQueuedJobs,
      longestQueuedWaitMs: status.scheduler.longestQueuedWaitMs,
      pressure: schedulerPressure(status),
    },
    workers: {
      mode: status.workers.mode,
      totalWorkers: status.workers.totalWorkers,
      busyWorkers: status.workers.busyWorkers,
      idleWorkers: status.workers.idleWorkers,
      queuedTasks: status.workers.queuedTasks,
      pressure: workerPressure(status),
    },
    degraded,
  };
}
