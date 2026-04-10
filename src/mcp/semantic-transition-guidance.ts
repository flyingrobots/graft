import type { CausalSurfaceNextAction } from "../contracts/causal-surface-next-action.js";
import type { PersistedLocalHistorySummary } from "./persisted-local-history.js";
import type { RepoObservation } from "./repo-state.js";

export function deriveCausalSurfaceNextAction(
  summaryNextAction: PersistedLocalHistorySummary["nextAction"],
  semanticTransition: RepoObservation["semanticTransition"],
): CausalSurfaceNextAction {
  if (
    summaryNextAction === "bind_workspace_to_begin_local_history"
    || summaryNextAction === "inspect_or_resume_local_history"
  ) {
    return summaryNextAction;
  }

  if (semanticTransition === null) {
    return summaryNextAction;
  }

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
      return summaryNextAction;
  }
}
