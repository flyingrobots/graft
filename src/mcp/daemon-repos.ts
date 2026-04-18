import type {
  AuthorizedWorkspaceRecord,
  DaemonSessionView,
} from "./daemon-control-plane.js";
import type { MonitorStatusView } from "./persistent-monitor-runtime.js";

import { buildResult, normalizeFilter, sortAuthorizedWorkspaces } from "./repo-overview/filter.js";
import { toRepoView } from "./repo-overview/view-projection.js";

// ---------------------------------------------------------------------------
// Barrel re-exports — keep every public type available from this path
// ---------------------------------------------------------------------------

export type {
  DaemonRepoFilter,
  DaemonRepoListView,
  DaemonRepoMonitorView,
  DaemonRepoOverviewOptions,
  DaemonRepoView,
  DaemonRepoWorktreeView,
} from "./repo-overview/types.js";

import type {
  DaemonRepoFilter,
  DaemonRepoListView,
  DaemonRepoOverviewOptions,
} from "./repo-overview/types.js";

// ---------------------------------------------------------------------------
// DaemonRepoOverview
// ---------------------------------------------------------------------------

export class DaemonRepoOverview {
  constructor(private readonly options: DaemonRepoOverviewOptions) {}

  async list(filter: DaemonRepoFilter = {}): Promise<DaemonRepoListView> {
    const normalizedFilter = normalizeFilter(filter);
    const resolvedRepoId = await this.resolveRepoIdFilter(normalizedFilter);
    if (normalizedFilter.cwd !== undefined && resolvedRepoId === null) {
      return buildResult(normalizedFilter, []);
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
      return buildResult(normalizedFilter, []);
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
        const repoSessions = sessionsByRepo.get(repoId) ?? [];
        const monitor = monitorsByRepo.get(repoId) ?? null;
        return toRepoView(repoId, sortedWorkspaces, repoSessions, monitor);
      })
      .sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir));

    return buildResult(normalizedFilter, repos);
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
}
