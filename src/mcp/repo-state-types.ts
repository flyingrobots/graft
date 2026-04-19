export type WorldlineLayer = "commit_worldline" | "ref_view" | "workspace_overlay";
export type RepoTransitionKind = "checkout" | "reset" | "merge" | "rebase";
export type RepoSemanticTransitionKind =
  | "index_update"
  | "conflict_resolution"
  | "merge_phase"
  | "rebase_phase"
  | "bulk_transition"
  | "unknown";
export type RepoSemanticTransitionAuthority =
  | "authoritative_git_state"
  | "repo_snapshot";
export type RepoSemanticTransitionPhase =
  | "started"
  | "conflicted"
  | "resolved_waiting_commit"
  | "continued"
  | "completed_or_cleared";

export interface RepoTransition {
  readonly kind: RepoTransitionKind;
  readonly fromRef: string | null;
  readonly toRef: string | null;
  readonly fromCommit: string | null;
  readonly toCommit: string | null;
  readonly evidence: {
    readonly reflogSubject: string | null;
  };
}

export interface RepoSemanticTransition {
  readonly kind: RepoSemanticTransitionKind;
  readonly authority: RepoSemanticTransitionAuthority;
  readonly phase: RepoSemanticTransitionPhase | null;
  readonly summary: string;
  readonly evidence: {
    readonly totalPaths: number;
    readonly stagedPaths: number;
    readonly changedPaths: number;
    readonly untrackedPaths: number;
    readonly unmergedPaths: number;
    readonly mergeInProgress: boolean;
    readonly rebaseInProgress: boolean;
    readonly rebaseStep: number | null;
    readonly rebaseTotalSteps: number | null;
    readonly lastTransitionKind: RepoTransitionKind | null;
    readonly reflogSubject: string | null;
  };
}

export interface WorkspaceOverlaySummary {
  readonly dirty: true;
  readonly totalPaths: number;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
  readonly actorGuess: "unknown";
  readonly confidence: "low";
  readonly evidence: {
    readonly source: "git status --porcelain";
    readonly reflogSubject: string | null;
    readonly sample: readonly string[];
  };
}

export interface RepoObservation {
  readonly checkoutEpoch: number;
  readonly headRef: string | null;
  readonly headSha: string | null;
  readonly dirty: boolean;
  readonly observedAt: string;
  readonly lastTransition: RepoTransition | null;
  readonly semanticTransition: RepoSemanticTransition | null;
  readonly workspaceOverlayId: string | null;
  readonly workspaceOverlay: WorkspaceOverlaySummary | null;
  readonly statusLines: readonly string[];
}

export interface RebaseProgressState {
  readonly inProgress: boolean;
  readonly step: number | null;
  readonly total: number | null;
}

export interface RepoSnapshot {
  readonly headRef: string | null;
  readonly headSha: string | null;
  readonly parentShas: readonly string[];
  readonly observedAt: string;
  readonly statusLines: readonly string[];
  readonly dirty: boolean;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
  readonly unmergedPaths: number;
  readonly mergeInProgress: boolean;
  readonly rebase: RebaseProgressState;
  readonly headReflog: HeadReflogEntry | null;
}

export interface HeadReflogEntry {
  readonly raw: string;
  readonly previousSha: string | null;
  readonly nextSha: string | null;
  readonly timestampSec: number | null;
  readonly subject: string;
}
