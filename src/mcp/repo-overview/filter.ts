import type { AuthorizedWorkspaceRecord } from "../daemon-control-plane.js";
import type { DaemonRepoFilter, DaemonRepoListView, DaemonRepoView } from "./types.js";

// ---------------------------------------------------------------------------
// Filter normalization
// ---------------------------------------------------------------------------

export function normalizeFilter(filter: DaemonRepoFilter): DaemonRepoFilter {
  const next: { repoId?: string; cwd?: string } = {};
  if (typeof filter.repoId === "string" && filter.repoId.trim().length > 0) {
    next.repoId = filter.repoId.trim();
  }
  if (typeof filter.cwd === "string" && filter.cwd.trim().length > 0) {
    next.cwd = filter.cwd.trim();
  }
  return next;
}

// ---------------------------------------------------------------------------
// Workspace sorting
// ---------------------------------------------------------------------------

export function sortAuthorizedWorkspaces(
  records: readonly AuthorizedWorkspaceRecord[],
): readonly AuthorizedWorkspaceRecord[] {
  return [...records].sort((left, right) => left.worktreeRoot.localeCompare(right.worktreeRoot));
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

export function buildResult(
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
