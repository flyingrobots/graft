import * as crypto from "node:crypto";
import { buildSemanticTransitionSummary } from "./semantic-transition-summary.js";
import type {
  RepoObservation,
  RepoSemanticTransition,
  RepoSemanticTransitionPhase,
  RepoSnapshot,
  RepoTransition,
  WorkspaceOverlaySummary,
} from "./repo-state-types.js";

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

function buildWorkspaceOverlayId(snapshot: RepoSnapshot, checkoutEpoch: number): string | null {
  if (!snapshot.dirty) return null;
  return stableId("overlay", `${String(checkoutEpoch)}\n${snapshot.statusLines.join("\n")}`);
}

function buildWorkspaceOverlay(snapshot: RepoSnapshot): WorkspaceOverlaySummary | null {
  if (!snapshot.dirty) return null;
  return {
    dirty: true,
    totalPaths: snapshot.statusLines.length,
    stagedPaths: snapshot.stagedPaths,
    changedPaths: snapshot.changedPaths,
    untrackedPaths: snapshot.untrackedPaths,
    actorGuess: "unknown",
    confidence: "low",
    evidence: {
      source: "git status --porcelain",
      reflogSubject: null,
      sample: snapshot.statusLines.slice(0, 10),
    },
  };
}

function buildSemanticTransitionEvidence(
  snapshot: RepoSnapshot,
  lastTransition: RepoTransition | null,
): RepoSemanticTransition["evidence"] {
  return {
    totalPaths: snapshot.statusLines.length,
    stagedPaths: snapshot.stagedPaths,
    changedPaths: snapshot.changedPaths,
    untrackedPaths: snapshot.untrackedPaths,
    unmergedPaths: snapshot.unmergedPaths,
    mergeInProgress: snapshot.mergeInProgress,
    rebaseInProgress: snapshot.rebase.inProgress,
    rebaseStep: snapshot.rebase.step,
    rebaseTotalSteps: snapshot.rebase.total,
    lastTransitionKind: lastTransition?.kind ?? null,
    reflogSubject: lastTransition?.evidence.reflogSubject ?? snapshot.headReflog?.subject ?? null,
  };
}

function statusLinesMatch(
  previous: readonly string[],
  current: readonly string[],
): boolean {
  return previous.length === current.length
    && previous.every((line, index) => line === current[index]);
}

const UNMERGED_STATUS_CODES = new Set([
  "DD",
  "AU",
  "UD",
  "UA",
  "DU",
  "AA",
  "UU",
  // Graft merges `diff-index` and `diff-files` plumbing rows. An unmerged
  // index row (`U`) plus a modified worktree row (`M`) therefore appears as
  // `UM`, even though porcelain status would normally render `UU`.
  "UM",
]);

function unmergedStatusLines(snapshot: RepoSnapshot): readonly string[] {
  return snapshot.statusLines.filter((line) => UNMERGED_STATUS_CODES.has(line.slice(0, 2)));
}

function mergeStateChanged(previous: RepoSnapshot | null, current: RepoSnapshot): boolean {
  return previous !== null && (
    previous.mergeInProgress !== current.mergeInProgress
    || previous.unmergedPaths !== current.unmergedPaths
    || !statusLinesMatch(unmergedStatusLines(previous), unmergedStatusLines(current))
  );
}

function rebaseStateChanged(previous: RepoSnapshot | null, current: RepoSnapshot): boolean {
  return previous !== null && (
    previous.rebase.inProgress !== current.rebase.inProgress
    || previous.rebase.step !== current.rebase.step
    || previous.rebase.total !== current.rebase.total
    || previous.unmergedPaths !== current.unmergedPaths
    || !statusLinesMatch(unmergedStatusLines(previous), unmergedStatusLines(current))
  );
}

export function buildSemanticTransition(
  previous: RepoSnapshot | null,
  current: RepoSnapshot,
  lastTransition: RepoTransition | null,
): RepoSemanticTransition | null {
  const evidence = buildSemanticTransitionEvidence(current, lastTransition);

  if (current.mergeInProgress) {
    const observationBasis = lastTransition?.kind === "merge"
      ? "git_transition_evidence"
      : (mergeStateChanged(previous, current) ? "snapshot_delta" : "current_state");
    return {
      kind: "merge_phase",
      authority: "authoritative_git_state",
      observationBasis,
      phase: current.unmergedPaths > 0 ? "conflicted" : "resolved_waiting_commit",
      summary: buildSemanticTransitionSummary({
        kind: "merge_phase",
        evidence,
        phase: current.unmergedPaths > 0 ? "conflicted" : "resolved_waiting_commit",
      }),
      evidence,
    };
  }

  if (current.rebase.inProgress) {
    const stateChanged = rebaseStateChanged(previous, current);
    const observationBasis = lastTransition?.kind === "rebase"
      ? "git_transition_evidence"
      : (stateChanged ? "snapshot_delta" : "current_state");
    const phase: RepoSemanticTransitionPhase | null = current.unmergedPaths > 0
      ? "conflicted"
      : (observationBasis === "current_state"
          ? null
          : (previous?.rebase.inProgress === true ? "continued" : "started"));
    return {
      kind: "rebase_phase",
      authority: "authoritative_git_state",
      observationBasis,
      phase,
      summary: buildSemanticTransitionSummary({
        kind: "rebase_phase",
        evidence,
        phase,
      }),
      evidence,
    };
  }

  const conflictStateChanged = previous !== null
    && (previous.unmergedPaths > 0 || current.unmergedPaths > 0)
    && (
      previous.unmergedPaths !== current.unmergedPaths
      || !statusLinesMatch(unmergedStatusLines(previous), unmergedStatusLines(current))
    );
  if (current.unmergedPaths > 0 || conflictStateChanged) {
    return {
      kind: "conflict_resolution",
      authority: "authoritative_git_state",
      observationBasis: conflictStateChanged ? "snapshot_delta" : "current_state",
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "conflict_resolution",
        evidence,
        phase: null,
        previousUnmergedPaths: previous?.unmergedPaths ?? null,
      }),
      evidence,
    };
  }

  if (lastTransition?.kind === "merge") {
    return {
      kind: "merge_phase",
      authority: "repo_snapshot",
      observationBasis: "git_transition_evidence",
      phase: "completed_or_cleared",
      summary: buildSemanticTransitionSummary({
        kind: "merge_phase",
        evidence,
        phase: "completed_or_cleared",
      }),
      evidence,
    };
  }

  if (lastTransition?.kind === "rebase") {
    return {
      kind: "rebase_phase",
      authority: "repo_snapshot",
      observationBasis: "git_transition_evidence",
      phase: "completed_or_cleared",
      summary: buildSemanticTransitionSummary({
        kind: "rebase_phase",
        evidence,
        phase: "completed_or_cleared",
      }),
      evidence,
    };
  }

  if (lastTransition !== null) {
    return {
      kind: "unknown",
      authority: "repo_snapshot",
      observationBasis: "git_transition_evidence",
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "unknown",
        evidence,
        phase: null,
      }),
      evidence,
    };
  }

  // Null means this observation supports no transition claim. It does not prove
  // that no unobserved transition occurred between equal endpoint snapshots.
  if (previous === null || statusLinesMatch(previous.statusLines, current.statusLines)) {
    return null;
  }

  if (current.statusLines.length >= 8) {
    return {
      kind: "bulk_transition",
      authority: "repo_snapshot",
      observationBasis: "snapshot_delta",
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "bulk_transition",
        evidence,
        phase: null,
      }),
      evidence,
    };
  }

  if (current.stagedPaths > 0) {
    return {
      kind: "index_update",
      authority: "repo_snapshot",
      observationBasis: "snapshot_delta",
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "index_update",
        evidence,
        phase: null,
      }),
      evidence,
    };
  }

  return {
    kind: "unknown",
    authority: "repo_snapshot",
    observationBasis: "snapshot_delta",
    phase: null,
    summary: buildSemanticTransitionSummary({
      kind: "unknown",
      evidence,
      phase: null,
    }),
    evidence,
  };
}

export function buildObservation(
  snapshot: RepoSnapshot,
  checkoutEpoch: number,
  lastTransition: RepoTransition | null,
  semanticTransition: RepoSemanticTransition | null,
): RepoObservation {
  return {
    checkoutEpoch,
    headRef: snapshot.headRef,
    headSha: snapshot.headSha,
    dirty: snapshot.dirty,
    observedAt: snapshot.observedAt,
    lastTransition,
    semanticTransition,
    workspaceOverlayId: buildWorkspaceOverlayId(snapshot, checkoutEpoch),
    workspaceOverlay: buildWorkspaceOverlay(snapshot),
    statusLines: snapshot.statusLines,
  };
}
