import type { AuthorizedWorkspaceRecord, DaemonSessionView } from "../daemon-control-plane.js";
import type { MonitorStatusView } from "../persistent-monitor-runtime.js";
import type { DaemonRepoMonitorView, DaemonRepoView, DaemonRepoWorktreeView } from "./types.js";

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

export function maxIsoTimestamp(values: readonly (string | null | undefined)[]): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (value === undefined || value === null || value.length === 0) continue;
    if (latest === null || value.localeCompare(latest) > 0) {
      latest = value;
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Worktree view projection
// ---------------------------------------------------------------------------

export function toWorktreeView(
  workspace: AuthorizedWorkspaceRecord,
  repoSessions: readonly DaemonSessionView[],
): DaemonRepoWorktreeView {
  return {
    worktreeId: workspace.worktreeId,
    worktreeRoot: workspace.worktreeRoot,
    activeSessions: repoSessions.filter((session) => {
      return session.bindState === "bound" && session.worktreeId === workspace.worktreeId;
    }).length,
    lastBoundAt: workspace.lastBoundAt,
  };
}

// ---------------------------------------------------------------------------
// Monitor view projection
// ---------------------------------------------------------------------------

export function toMonitorView(monitor: MonitorStatusView): DaemonRepoMonitorView {
  return {
    workerKind: monitor.workerKind,
    lifecycleState: monitor.lifecycleState,
    health: monitor.health,
    lastTickAt: monitor.lastTickAt,
    lastSuccessAt: monitor.lastSuccessAt,
    lastError: monitor.lastError,
  };
}

// ---------------------------------------------------------------------------
// Repo view assembly
// ---------------------------------------------------------------------------

export function toRepoView(
  repoId: string,
  sortedWorkspaces: readonly AuthorizedWorkspaceRecord[],
  repoSessions: readonly DaemonSessionView[],
  monitor: MonitorStatusView | null,
): DaemonRepoView {
  const firstWorkspace = sortedWorkspaces[0];
  if (firstWorkspace === undefined) {
    throw new Error(`DaemonRepoOverview: missing workspace for repo ${repoId}`);
  }
  const worktrees = sortedWorkspaces.map((workspace) => toWorktreeView(workspace, repoSessions));
  const boundSessions = repoSessions.filter((session) => session.bindState === "bound").length;
  const lastBoundAt = maxIsoTimestamp(sortedWorkspaces.map((workspace) => workspace.lastBoundAt));
  const lastActivityAt = maxIsoTimestamp([
    ...sortedWorkspaces.map((workspace) => workspace.authorizedAt),
    ...sortedWorkspaces.map((workspace) => workspace.lastBoundAt),
    ...repoSessions.map((session) => session.lastActivityAt),
    ...(monitor === null
      ? []
      : [monitor.lastStartedAt, monitor.lastTickAt, monitor.lastSuccessAt]),
  ]);
  return {
    repoId,
    gitCommonDir: firstWorkspace.gitCommonDir,
    authorizedWorkspaces: sortedWorkspaces.length,
    boundSessions,
    activeWorktrees: worktrees.filter((worktree) => worktree.activeSessions > 0).length,
    backlogCommits: monitor?.backlogCommits ?? 0,
    lastBoundAt,
    lastActivityAt,
    monitor: monitor === null ? null : toMonitorView(monitor),
    worktrees,
  };
}
