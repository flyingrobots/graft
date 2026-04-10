import { z } from "zod";

export const CAUSAL_SURFACE_NEXT_ACTIONS = [
  "bind_workspace_to_begin_local_history",
  "continue_active_causal_workspace",
  "review_transition_boundary_before_continuing",
  "inspect_or_resume_local_history",
  "resolve_conflicts_before_continuing",
  "complete_merge_phase_before_continuing",
  "continue_rebase_phase_before_continuing",
  "inspect_bulk_transition_scope_before_continuing",
] as const;

export const causalSurfaceNextActionSchema = z.enum(CAUSAL_SURFACE_NEXT_ACTIONS);
export type CausalSurfaceNextAction = z.infer<typeof causalSurfaceNextActionSchema>;
