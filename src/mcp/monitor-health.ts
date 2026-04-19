import type {
  MonitorHealth,
  MonitorLifecycleState,
  MonitorStatusView,
  PersistedMonitorRecord,
} from "./monitor-types.js";

/**
 * Derive the health value for a monitor based on its lifecycle state and
 * an optional tick result.
 *
 * When the lifecycle is paused or stopped the health always matches the
 * lifecycle.  Otherwise the caller supplies the "active" health that
 * reflects what happened during the tick.
 */
export function deriveHealth(
  lifecycleState: MonitorLifecycleState,
  activeHealth: MonitorHealth,
): MonitorHealth {
  if (lifecycleState === "paused") return "paused";
  if (lifecycleState === "stopped") return "stopped";
  return activeHealth;
}

/**
 * Derive the health to assign after a lifecycle transition (pause/stop/resume).
 */
export function deriveTransitionHealth(
  lifecycleState: MonitorLifecycleState,
): MonitorHealth {
  if (lifecycleState === "paused") return "paused";
  if (lifecycleState === "stopped") return "stopped";
  return "lagging";
}

/**
 * Normalize a poll interval value, falling back to the provided default.
 * Throws if the value is not a positive finite integer.
 */
export function normalizePollIntervalMs(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("pollIntervalMs must be a positive integer");
  }
  return normalized;
}

/**
 * Sort an array of monitor status views by gitCommonDir for deterministic output.
 */
export function sortStatuses(statuses: readonly MonitorStatusView[]): readonly MonitorStatusView[] {
  return [...statuses].sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir));
}

/**
 * Project a persisted record plus an authorized-workspace count into a
 * read-only status view.
 */
export function toStatusView(
  record: PersistedMonitorRecord,
  authorizedWorkspaces: number,
): MonitorStatusView {
  return {
    repoId: record.repoId,
    gitCommonDir: record.gitCommonDir,
    anchorWorktreeRoot: record.anchorWorktreeRoot,
    authorizedWorkspaces,
    workerKind: record.workerKind,
    lifecycleState: record.lifecycleState,
    health: record.health,
    pollIntervalMs: record.pollIntervalMs,
    lastStartedAt: record.lastStartedAt,
    lastTickAt: record.lastTickAt,
    lastSuccessAt: record.lastSuccessAt,
    lastError: record.lastError,
    lastIndexedCommit: record.lastIndexedCommit,
    lastHeadCommit: record.lastHeadCommit,
    backlogCommits: record.backlogCommits,
    lastRunCommitsIndexed: record.lastRunCommitsIndexed,
    lastRunPatchesWritten: record.lastRunPatchesWritten,
  };
}
