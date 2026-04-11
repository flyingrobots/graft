import type {
  AuthorizedWorkspaceRecord,
  DaemonControlPlane,
  DaemonSessionView,
} from "./daemon-control-plane.js";
import type {
  MonitorHealth,
  MonitorLifecycleState,
  MonitorStatusView,
  MonitorWorkerKind,
  PersistentMonitorRuntime,
} from "./persistent-monitor-runtime.js";

export interface DaemonRepoFilter {
  readonly repoId?: string | undefined;
  readonly cwd?: string | undefined;
}

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

export interface DaemonRepoOverviewOptions {
  readonly controlPlane: DaemonControlPlane;
  readonly monitorRuntime: PersistentMonitorRuntime;
}

function normalizeFilter(filter: DaemonRepoFilter): DaemonRepoFilter {
  const next: { repoId?: string; cwd?: string } = {};
  if (typeof filter.repoId === "string" && filter.repoId.trim().length > 0) {
    next.repoId = filter.repoId.trim();
  }
  if (typeof filter.cwd === "string" && filter.cwd.trim().length > 0) {
    next.cwd = filter.cwd.trim();
  }
  return next;
}

function maxIsoTimestamp(values: readonly (string | null | undefined)[]): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (value === undefined || value === null || value.length === 0) continue;
    if (latest === null || value.localeCompare(latest) > 0) {
      latest = value;
    }
  }
  return latest;
}

function sortAuthorizedWorkspaces(
  records: readonly AuthorizedWorkspaceRecord[],
): readonly AuthorizedWorkspaceRecord[] {
  return [...records].sort((left, right) => left.worktreeRoot.localeCompare(right.worktreeRoot));
}

export class DaemonRepoOverview {
  constructor(private readonly options: DaemonRepoOverviewOptions) {}

  async list(filter: DaemonRepoFilter = {}): Promise<DaemonRepoListView> {
    const normalizedFilter = normalizeFilter(filter);
    const resolvedRepoId = await this.resolveRepoIdFilter(normalizedFilter);
    if (normalizedFilter.cwd !== undefined && resolvedRepoId === null) {
      return this.buildResult(normalizedFilter, []);
    }

    const repoIdFilter = resolvedRepoId ?? normalizedFilter.repoId;
    const [authorizedWorkspaces, monitors] = await Promise.all([
      this.options.controlPlane.listAuthorizedWorkspaceRecords(),
      this.options.monitorRuntime.listStatuses(),
    ]);
    const sessions = this.options.controlPlane.listSessions();
    const visibleWorkspaces = authorizedWorkspaces.filter((workspace) => {
      return repoIdFilter === undefined || workspace.repoId === repoIdFilter;
    });
    if (visibleWorkspaces.length === 0) {
      return this.buildResult(normalizedFilter, []);
    }

    const workspacesByRepo = new Map<string, AuthorizedWorkspaceRecord[]>();
    for (const workspace of visibleWorkspaces) {
      const bucket = workspacesByRepo.get(workspace.repoId) ?? [];
      bucket.push(workspace);
      workspacesByRepo.set(workspace.repoId, bucket);
    }

    const sessionsByRepo = new Map<string, DaemonSessionView[]>();
    for (const session of sessions) {
      if (session.repoId === null) continue;
      if (repoIdFilter !== undefined && session.repoId !== repoIdFilter) continue;
      const bucket = sessionsByRepo.get(session.repoId) ?? [];
      bucket.push(session);
      sessionsByRepo.set(session.repoId, bucket);
    }

    const monitorsByRepo = new Map<string, MonitorStatusView>();
    for (const status of monitors) {
      if (repoIdFilter !== undefined && status.repoId !== repoIdFilter) continue;
      monitorsByRepo.set(status.repoId, status);
    }

    const repos = [...workspacesByRepo.entries()]
      .map(([repoId, repoWorkspaces]) => {
        const sortedWorkspaces = sortAuthorizedWorkspaces(repoWorkspaces);
        const firstWorkspace = sortedWorkspaces[0];
        if (firstWorkspace === undefined) {
          throw new Error(`DaemonRepoOverview: missing workspace for repo ${repoId}`);
        }
        const repoSessions = sessionsByRepo.get(repoId) ?? [];
        const monitor = monitorsByRepo.get(repoId) ?? null;
        const worktrees = sortedWorkspaces.map((workspace) => {
          return this.toWorktreeView(workspace, repoSessions);
        });
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
          monitor: monitor === null
            ? null
            : {
              workerKind: monitor.workerKind,
              lifecycleState: monitor.lifecycleState,
              health: monitor.health,
              lastTickAt: monitor.lastTickAt,
              lastSuccessAt: monitor.lastSuccessAt,
              lastError: monitor.lastError,
            },
          worktrees,
        } satisfies DaemonRepoView;
      })
      .sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir));

    return this.buildResult(normalizedFilter, repos);
  }

  private async resolveRepoIdFilter(filter: DaemonRepoFilter): Promise<string | null | undefined> {
    if (filter.cwd === undefined) return undefined;
    const workspace = await this.options.controlPlane.getAuthorizedWorkspace({ cwd: filter.cwd });
    if (workspace === null) return null;
    if (filter.repoId !== undefined && workspace.repoId !== filter.repoId) {
      return null;
    }
    return workspace.repoId;
  }

  private buildResult(
    filter: DaemonRepoFilter,
    repos: readonly DaemonRepoView[],
  ): DaemonRepoListView {
    if (Object.keys(filter).length === 0) {
      return { repos };
    }
    return {
      repos,
      filter,
    };
  }

  private toWorktreeView(
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
}
