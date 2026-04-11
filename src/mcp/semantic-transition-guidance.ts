import type { CausalSurfaceNextAction } from "../contracts/causal-surface-next-action.js";
import type { PersistedLocalHistorySummary } from "./persisted-local-history.js";
import type { RepoConcurrencySummary } from "./repo-concurrency.js";
import type { RepoObservation } from "./repo-state.js";

export function deriveCausalSurfaceNextAction(
  summaryNextAction: PersistedLocalHistorySummary["nextAction"],
  semanticTransition: RepoObservation["semanticTransition"],
  repoConcurrency: RepoConcurrencySummary | null,
): CausalSurfaceNextAction {
  if (
    summaryNextAction === "bind_workspace_to_begin_local_history"
    || summaryNextAction === "inspect_or_resume_local_history"
  ) {
    return summaryNextAction;
  }

  if (semanticTransition !== null) {
    switch (semanticTransition.kind) {
      case "conflict_resolution":
        return "resolve_conflicts_before_continuing";
      case "merge_phase":
        return semanticTransition.phase === "completed_or_cleared"
          ? summaryNextAction
          : "complete_merge_phase_before_continuing";
      case "rebase_phase":
        return semanticTransition.phase === "completed_or_cleared"
          ? summaryNextAction
          : "continue_rebase_phase_before_continuing";
      case "bulk_transition":
        return "inspect_bulk_transition_scope_before_continuing";
      case "index_update":
      case "unknown":
        break;
    }
  }

  if (repoConcurrency === null) {
    return summaryNextAction;
  }

  switch (repoConcurrency.posture) {
    case "divergent_checkout":
      return "review_divergent_checkout_before_continuing";
    case "shared_worktree":
      if (summaryNextAction === "review_transition_boundary_before_continuing") {
        return summaryNextAction;
      }
      return "coordinate_shared_worktree_before_continuing";
    case "overlapping_actors":
      if (summaryNextAction === "review_transition_boundary_before_continuing") {
        return summaryNextAction;
      }
      return "inspect_overlapping_actor_activity_before_continuing";
    case "exclusive":
    case "shared_repo_only":
    case "unknown":
      return summaryNextAction;
  }
}
