import { z } from "zod";

/** Closed vocabulary for evidence gaps surfaced by summary-first diagnostics. */
export const DIAGNOSTIC_EVIDENCE_GAPS = [
  "structural_history_readiness_unknown",
  "workspace_unbound",
  "local_history_unavailable",
  "local_history_inactive",
  "target_repo_hooks_absent",
  "target_repo_hooks_unrecognized",
  "local_edit_watchers_absent",
  "shared_repo_only",
  "shared_worktree",
  "overlapping_actors",
  "divergent_checkout",
  "repo_concurrency_unknown",
] as const;

export type DiagnosticEvidenceGap = (typeof DIAGNOSTIC_EVIDENCE_GAPS)[number];

export const diagnosticEvidenceGapSchema = z.enum(DIAGNOSTIC_EVIDENCE_GAPS);
