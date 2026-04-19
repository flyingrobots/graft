import type { DaemonSchedulerCounts } from "../daemon-job-scheduler.js";
import type { DaemonWorkerCounts } from "../daemon-worker-pool.js";
import type { WorkspaceCapabilityProfile } from "../workspace-router.js";
import { cloneCapabilityProfile } from "./authz-storage.js";
import type {
  AuthorizedWorkspaceRecord,
  AuthorizedWorkspaceView,
  DaemonMonitorCounts,
  DaemonRuntimeDescriptor,
  DaemonSessionView,
  DaemonStatusView,
} from "./types.js";

// ---------------------------------------------------------------------------
// Zero-value defaults
// ---------------------------------------------------------------------------

export const ZERO_MONITOR_COUNTS: DaemonMonitorCounts = Object.freeze({
  totalMonitors: 0,
  runningMonitors: 0,
  pausedMonitors: 0,
  stoppedMonitors: 0,
  failingMonitors: 0,
  backlogMonitors: 0,
});

// ---------------------------------------------------------------------------
// Status view assembly
// ---------------------------------------------------------------------------

export function buildStatusView(
  runtime: DaemonRuntimeDescriptor,
  sessions: readonly DaemonSessionView[],
  authorizedWorkspaces: ReadonlyMap<string, AuthorizedWorkspaceRecord>,
  defaultCapabilityProfile: WorkspaceCapabilityProfile,
  monitorCounts: DaemonMonitorCounts,
  schedulerCounts: DaemonSchedulerCounts,
  workerCounts: DaemonWorkerCounts,
): DaemonStatusView {
  const boundSessions = sessions.filter((session) => session.bindState === "bound").length;
  return {
    ok: true,
    sessionMode: "daemon",
    activeSessions: sessions.length,
    boundSessions,
    unboundSessions: sessions.length - boundSessions,
    authorizedWorkspaces: authorizedWorkspaces.size,
    authorizedRepos: new Set([...authorizedWorkspaces.values()].map((record) => record.repoId)).size,
    workspaceBindRequiresAuthorization: true,
    defaultCapabilityProfile: cloneCapabilityProfile(defaultCapabilityProfile),
    totalMonitors: monitorCounts.totalMonitors,
    runningMonitors: monitorCounts.runningMonitors,
    pausedMonitors: monitorCounts.pausedMonitors,
    stoppedMonitors: monitorCounts.stoppedMonitors,
    failingMonitors: monitorCounts.failingMonitors,
    backlogMonitors: monitorCounts.backlogMonitors,
    scheduler: schedulerCounts,
    workers: workerCounts,
    ...runtime,
  };
}

// ---------------------------------------------------------------------------
// Authorized workspace view projection
// ---------------------------------------------------------------------------

export function toAuthorizedWorkspaceView(
  record: AuthorizedWorkspaceRecord,
  activeSessionCount: number,
): AuthorizedWorkspaceView {
  return {
    ...record,
    capabilityProfile: cloneCapabilityProfile(record.capabilityProfile),
    activeSessions: activeSessionCount,
  };
}
