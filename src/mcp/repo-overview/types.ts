import type { DaemonControlPlane } from "../daemon-control-plane.js";
import type {
  MonitorHealth,
  MonitorLifecycleState,
  MonitorWorkerKind,
  PersistentMonitorRuntime,
} from "../persistent-monitor-runtime.js";

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

export interface DaemonRepoFilter {
  readonly repoId?: string | undefined;
  readonly cwd?: string | undefined;
}

// ---------------------------------------------------------------------------
// View projections
// ---------------------------------------------------------------------------

export interface DaemonRepoWorktreeView {
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly activeSessions: number;
  readonly lastBoundAt: string | null;
}

export interface DaemonRepoMonitorView {
  readonly workerKind: MonitorWorkerKind;
  readonly lifecycleState: MonitorLifecycleState;
  readonly health: MonitorHealth;
  readonly lastTickAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastError: string | null;
}

export interface DaemonRepoView {
  readonly repoId: string;
  readonly gitCommonDir: string;
  readonly authorizedWorkspaces: number;
  readonly boundSessions: number;
  readonly activeWorktrees: number;
  readonly backlogCommits: number;
  readonly lastBoundAt: string | null;
  readonly lastActivityAt: string | null;
  readonly monitor: DaemonRepoMonitorView | null;
  readonly worktrees: readonly DaemonRepoWorktreeView[];
}

export interface DaemonRepoListView {
  readonly repos: readonly DaemonRepoView[];
  readonly filter?: DaemonRepoFilter | undefined;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DaemonRepoOverviewOptions {
  readonly controlPlane: DaemonControlPlane;
  readonly monitorRuntime: PersistentMonitorRuntime;
}
