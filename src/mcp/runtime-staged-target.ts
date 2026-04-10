import * as crypto from "node:crypto";
import type { AttributionSummary, StagedTarget } from "../contracts/causal-ontology.js";
import type { RepoObservation } from "./repo-state.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type { WorkspaceStatus } from "./workspace-router.js";

const FULL_FILE_SAFE_STATUSES = new Set(["A", "D", "R", "C", "T"]);

export interface RuntimeStagedTargetNone {
  readonly availability: "none";
  readonly stability: "runtime_local";
  readonly provenanceLevel: "artifact_history";
}

export interface RuntimeStagedTargetFullFile {
  readonly availability: "full_file";
  readonly stability: "runtime_local";
  readonly provenanceLevel: "artifact_history";
  readonly attribution: AttributionSummary;
  readonly target: StagedTarget;
}

export interface RuntimeStagedTargetAmbiguous {
  readonly availability: "ambiguous";
  readonly stability: "runtime_local";
  readonly provenanceLevel: "artifact_history";
  readonly attribution: AttributionSummary;
  readonly reason:
    | "missing_head_commit"
    | "missing_workspace_overlay"
    | "modified_path_selection_requires_deeper_evidence";
  readonly observedStagedPaths: number;
  readonly ambiguousPaths: readonly string[];
}

export type RuntimeStagedTarget =
  | RuntimeStagedTargetNone
  | RuntimeStagedTargetFullFile
  | RuntimeStagedTargetAmbiguous;

interface MergedStatusEntry {
  readonly path: string;
  readonly stagedStatus: string;
  readonly worktreeStatus: string;
}

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

function parseMergedStatusLine(line: string): MergedStatusEntry | null {
  if (line.length < 4) return null;
  return {
    stagedStatus: line[0] ?? " ",
    worktreeStatus: line[1] ?? " ",
    path: line.slice(3),
  };
}

function stagedEntries(statusLines: readonly string[]): readonly MergedStatusEntry[] {
  return statusLines
    .map(parseMergedStatusLine)
    .filter((entry): entry is MergedStatusEntry => entry !== null && entry.stagedStatus !== " " && entry.stagedStatus !== "?");
}

function isFullFileSafe(entry: MergedStatusEntry): boolean {
  return entry.worktreeStatus === " " && FULL_FILE_SAFE_STATUSES.has(entry.stagedStatus);
}

export function buildRuntimeStagedTarget(
  status: WorkspaceStatus,
  causalContext: RuntimeCausalContext,
  repoState: RepoObservation,
  attribution: AttributionSummary,
): RuntimeStagedTarget {
  const observedEntries = stagedEntries(repoState.statusLines);
  if (observedEntries.length === 0) {
    return {
      availability: "none",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
    };
  }

  if (repoState.headSha === null) {
    return {
      availability: "ambiguous",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
      attribution,
      reason: "missing_head_commit",
      observedStagedPaths: observedEntries.length,
      ambiguousPaths: observedEntries.map((entry) => entry.path),
    };
  }

  if (repoState.workspaceOverlayId === null || status.repoId === null || status.worktreeId === null) {
    return {
      availability: "ambiguous",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
      attribution,
      reason: "missing_workspace_overlay",
      observedStagedPaths: observedEntries.length,
      ambiguousPaths: observedEntries.map((entry) => entry.path),
    };
  }

  const ambiguousEntries = observedEntries.filter((entry) => !isFullFileSafe(entry));
  if (ambiguousEntries.length > 0) {
    return {
      availability: "ambiguous",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
      attribution,
      reason: "modified_path_selection_requires_deeper_evidence",
      observedStagedPaths: observedEntries.length,
      ambiguousPaths: ambiguousEntries.map((entry) => entry.path),
    };
  }

  const selectionEntries = observedEntries.map((entry) => ({
    path: entry.path,
    symbols: [],
    regions: [],
  }));

  const target: StagedTarget = {
    targetId: stableId(
      "target",
      JSON.stringify({
        repoId: status.repoId,
        worktreeId: status.worktreeId,
        checkoutEpochId: causalContext.checkoutEpochId,
        workspaceOverlayId: repoState.workspaceOverlayId,
        headSha: repoState.headSha,
        paths: selectionEntries.map((entry) => entry.path),
      }),
    ),
    targetKind: "staged_target",
    repoId: status.repoId,
    worktreeId: status.worktreeId,
    checkoutEpochId: causalContext.checkoutEpochId,
    workspaceOverlayId: repoState.workspaceOverlayId,
    selectedAt: repoState.observedAt,
    selectionKind: "full_file",
    selectionEntries,
    base: {
      headCommitSha: repoState.headSha,
      indexTreeSha: null,
    },
  };

  return {
    availability: "full_file",
    stability: "runtime_local",
    provenanceLevel: "artifact_history",
    attribution,
    target,
  };
}
