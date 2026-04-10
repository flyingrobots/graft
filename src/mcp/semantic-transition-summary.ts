interface SemanticTransitionSummaryEvidence {
  readonly totalPaths: number;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
  readonly unmergedPaths: number;
  readonly mergeInProgress: boolean;
  readonly rebaseInProgress: boolean;
  readonly rebaseStep: number | null;
  readonly rebaseTotalSteps: number | null;
  readonly lastTransitionKind: "checkout" | "reset" | "merge" | "rebase" | null;
  readonly reflogSubject: string | null;
}

type SemanticTransitionKind =
  | "index_update"
  | "conflict_resolution"
  | "merge_phase"
  | "rebase_phase"
  | "bulk_transition"
  | "unknown";

type SemanticTransitionPhase =
  | "started"
  | "conflicted"
  | "resolved_waiting_commit"
  | "continued"
  | "completed_or_cleared"
  | null;

function buildConflictResolutionSummary(
  evidence: SemanticTransitionSummaryEvidence,
  previousUnmergedPaths: number | null,
): string {
  if (evidence.unmergedPaths === 0) {
    if (previousUnmergedPaths !== null && previousUnmergedPaths > 0) {
      return `Conflict posture cleared from ${String(previousUnmergedPaths)} conflicted path(s).`;
    }
    return "Conflict posture cleared after an explicit conflict-resolution movement.";
  }

  if (previousUnmergedPaths === null) {
    return `Conflict posture is active across ${String(evidence.unmergedPaths)} path(s).`;
  }

  if (previousUnmergedPaths === 0) {
    return `Conflict posture emerged across ${String(evidence.unmergedPaths)} path(s).`;
  }

  if (evidence.unmergedPaths < previousUnmergedPaths) {
    return `Conflict posture is shrinking from ${String(previousUnmergedPaths)} to ${String(evidence.unmergedPaths)} path(s).`;
  }

  if (evidence.unmergedPaths > previousUnmergedPaths) {
    return `Conflict posture widened from ${String(previousUnmergedPaths)} to ${String(evidence.unmergedPaths)} path(s).`;
  }

  return `Conflict posture remains active across ${String(evidence.unmergedPaths)} path(s).`;
}

function buildBulkTransitionSummary(evidence: SemanticTransitionSummaryEvidence): string {
  if (
    evidence.stagedPaths === evidence.totalPaths
    && evidence.changedPaths === 0
    && evidence.untrackedPaths === 0
  ) {
    return `Bulk staging spans ${String(evidence.totalPaths)} path(s) at the index boundary.`;
  }
  if (
    evidence.changedPaths === evidence.totalPaths
    && evidence.stagedPaths === 0
    && evidence.untrackedPaths === 0
  ) {
    return `Bulk edit sweep spans ${String(evidence.totalPaths)} unstaged path(s).`;
  }
  return `Bulk transition movement spans ${String(evidence.totalPaths)} path(s) with ${String(evidence.stagedPaths)} staged and ${String(evidence.changedPaths)} unstaged changes.`;
}

export function buildSemanticTransitionSummary(input: {
  readonly kind: SemanticTransitionKind;
  readonly evidence: SemanticTransitionSummaryEvidence;
  readonly phase: SemanticTransitionPhase;
  readonly previousUnmergedPaths?: number | null;
}): string {
  const { kind, evidence, phase, previousUnmergedPaths = null } = input;
  switch (kind) {
    case "merge_phase":
      switch (phase) {
        case "conflicted":
          return `Merge is in conflict across ${String(evidence.unmergedPaths)} path(s).`;
        case "resolved_waiting_commit":
          return "Merge conflicts are cleared and the merge is waiting for commit/admission.";
        case "completed_or_cleared":
          return "Merge transition completed or merge state has cleared.";
        case "started":
          return "Merge started and is now inspectable as active repo state.";
        case "continued":
          return "Merge progressed and remains active.";
        default:
          return "Merge state is active.";
      }
    case "rebase_phase":
      switch (phase) {
        case "conflicted":
          return `Rebase is in conflict across ${String(evidence.unmergedPaths)} path(s).`;
        case "continued":
          return evidence.rebaseStep !== null && evidence.rebaseTotalSteps !== null
            ? `Rebase continued at step ${String(evidence.rebaseStep)} of ${String(evidence.rebaseTotalSteps)}.`
            : "Rebase continued and remains active.";
        case "completed_or_cleared":
          return "Rebase transition completed or rebase state has cleared.";
        case "started":
          return "Rebase started and is now inspectable as active repo state.";
        case "resolved_waiting_commit":
          return "Rebase conflicts are cleared and the rebase is waiting for the next step.";
        default:
          return "Rebase state is active.";
      }
    case "conflict_resolution":
      return buildConflictResolutionSummary(evidence, previousUnmergedPaths);
    case "index_update":
      return evidence.totalPaths > 1
        ? `Index/staging boundary changed across ${String(evidence.totalPaths)} path(s).`
        : "Index/staging boundary changed.";
    case "bulk_transition":
      return buildBulkTransitionSummary(evidence);
    case "unknown":
      return "Repo/workspace movement is inspectable, but the semantic transition meaning remains unknown.";
  }
}
