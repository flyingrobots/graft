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

export function buildSemanticTransition(
  previous: RepoSnapshot | null,
  current: RepoSnapshot,
  lastTransition: RepoTransition | null,
): RepoSemanticTransition | null {
  const evidence = buildSemanticTransitionEvidence(current, lastTransition);

  if (current.mergeInProgress) {
    return {
      kind: "merge_phase",
      authority: "authoritative_git_state",
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
    const phase: RepoSemanticTransitionPhase = current.unmergedPaths > 0
      ? "conflicted"
      : ((current.rebase.step ?? 1) > 1 ? "continued" : "started");
    return {
      kind: "rebase_phase",
      authority: "authoritative_git_state",
      phase,
      summary: buildSemanticTransitionSummary({
        kind: "rebase_phase",
        evidence,
        phase,
      }),
      evidence,
    };
  }

  const unmergedChanged = previous !== null && previous.unmergedPaths !== current.unmergedPaths;
  if (current.unmergedPaths > 0 || unmergedChanged) {
    return {
      kind: "conflict_resolution",
      authority: "authoritative_git_state",
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
      phase: "completed_or_cleared",
      summary: buildSemanticTransitionSummary({
        kind: "rebase_phase",
        evidence,
        phase: "completed_or_cleared",
      }),
      evidence,
    };
  }

  if (current.statusLines.length >= 8) {
    return {
      kind: "bulk_transition",
      authority: "repo_snapshot",
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
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "index_update",
        evidence,
        phase: null,
      }),
      evidence,
    };
  }

  if (current.statusLines.length > 0) {
    return {
      kind: "unknown",
      authority: "repo_snapshot",
      phase: null,
      summary: buildSemanticTransitionSummary({
        kind: "unknown",
        evidence,
        phase: null,
      }),
      evidence,
    };
  }

  return null;
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
