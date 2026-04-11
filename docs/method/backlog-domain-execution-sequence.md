# Backlog Domain Execution Sequence

This document maps the current backlog into executable domain features,
then orders those features so each tranche builds substrate for the
next one.

The unit of execution here is a feature packet, not an individual card.
One packet may retire or advance several backlog items together. This is
intentional: the current backlog is larger than the number of lawful
implementation tranches.

## Ordering Rules

1. Remove shared-daemon blocking paths before adding fairness policy.
2. Move heavy repo work onto an explicit scheduler before expanding
   multi-agent or multi-writer behavior.
3. Make WARP writer and provenance semantics explicit before building
   rename, impact, or other refactor automation.
4. Treat `CLEAN_CODE_*` cards as attached debt for the nearest product
   packet, not as a parallel cleanup queue.
5. Hold long-tail cool ideas until the substrate they assume is already
   real.

## Phase 1: Shared Daemon Throughput

### Packet 1. Async Git closeout
Backlog docs:
- [CORE_async-git-client-via-plumbing.md](backlog/up-next/CORE_async-git-client-via-plumbing.md)
- [CLEAN_CODE_git-diff.md](backlog/bad-code/CLEAN_CODE_git-diff.md)
- [CLEAN_CODE_mcp-repo-state.md](backlog/bad-code/CLEAN_CODE_mcp-repo-state.md)
- [CLEAN_CODE_mcp-workspace-router-composition.md](backlog/bad-code/CLEAN_CODE_mcp-workspace-router-composition.md)
- [CLEAN_CODE_warp-plumbing-declaration.md](backlog/bad-code/CLEAN_CODE_warp-plumbing-declaration.md)

Status:
- partially landed in commit `b5335fc`

Subsequence:
1. Audit the async Git seam for any remaining sync Git escape hatches.
2. Retire follow-on debt in repo-state, diff, and workspace resolution.
3. Normalize error/evidence reporting for non-zero Git exits.
4. Close the backlog card once daemon-path Git calls are async by default.

Effort: M
Risk: M

### Packet 2. Async filesystem on daemon request paths
Backlog docs:
- [CORE_async-filesystem-port-on-request-paths.md](backlog/up-next/CORE_async-filesystem-port-on-request-paths.md)
- [CLEAN_CODE_ports-filesystem.md](backlog/bad-code/CLEAN_CODE_ports-filesystem.md)
- [CLEAN_CODE_mcp-tool-safe-read.md](backlog/bad-code/CLEAN_CODE_mcp-tool-safe-read.md)
- [CLEAN_CODE_mcp-tool-file-outline.md](backlog/bad-code/CLEAN_CODE_mcp-tool-file-outline.md)
- [CLEAN_CODE_mcp-tool-read-range.md](backlog/bad-code/CLEAN_CODE_mcp-tool-read-range.md)
- [CLEAN_CODE_mcp-tool-changed-since.md](backlog/bad-code/CLEAN_CODE_mcp-tool-changed-since.md)
- [CLEAN_CODE_operations-safe-read.md](backlog/bad-code/CLEAN_CODE_operations-safe-read.md)
- [CLEAN_CODE_operations-file-outline.md](backlog/bad-code/CLEAN_CODE_operations-file-outline.md)
- [CLEAN_CODE_operations-read-range.md](backlog/bad-code/CLEAN_CODE_operations-read-range.md)

Depends on:
- Packet 1

Subsequence:
1. Replace daemon-path `readFileSync` usage with async reads.
2. Make policy preflight and cache-check paths async where required.
3. Preserve current refusal, unsupported-language, and cache semantics.
4. Keep CLI-only or hook-only sync reads explicitly out of scope unless
   they sit on the shared daemon path.

Effort: M
Risk: M

### Packet 3. Scheduler contract and worker pool
Backlog docs:
- [SURFACE_daemon-job-scheduler-and-worker-pool.md](backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md)
- [CLEAN_CODE_mcp-server.md](backlog/bad-code/CLEAN_CODE_mcp-server.md)
- [CLEAN_CODE_mcp-context.md](backlog/bad-code/CLEAN_CODE_mcp-context.md)
- [CLEAN_CODE_mcp-daemon-server-lifecycle-composition.md](backlog/bad-code/CLEAN_CODE_mcp-daemon-server-lifecycle-composition.md)
- [CLEAN_CODE_mcp-daemon-control-plane-composition.md](backlog/bad-code/CLEAN_CODE_mcp-daemon-control-plane-composition.md)
- [CLEAN_CODE_mcp-metrics-boundaries.md](backlog/bad-code/CLEAN_CODE_mcp-metrics-boundaries.md)

Depends on:
- Packet 1
- Packet 2

Subsequence:
1. Define `sliceId` and bind/rebind-safe session-slice lifecycle.
2. Define immutable job envelopes and worker result deltas.
3. Move heavy repo-scoped work off the direct request path.
4. Add bounded queue inspection, cancellation, and timeout posture.
5. Keep cheap control-plane tools inline.

Effort: L
Risk: H

### Packet 4. Monitors through the scheduler
Backlog docs:
- [SURFACE_monitors-run-through-scheduler.md](backlog/up-next/SURFACE_monitors-run-through-scheduler.md)
- [FEEDBACK_graft_map_token_overflow.md](backlog/inbox/FEEDBACK_graft_map_token_overflow.md)
- [CLEAN_CODE_mcp-persistent-monitor-runtime-composition.md](backlog/bad-code/CLEAN_CODE_mcp-persistent-monitor-runtime-composition.md)
- [CLEAN_CODE_mcp-daemon-repo-overview-composition.md](backlog/bad-code/CLEAN_CODE_mcp-daemon-repo-overview-composition.md)
- [CLEAN_CODE_mcp-tool-stats.md](backlog/bad-code/CLEAN_CODE_mcp-tool-stats.md)
- [CLEAN_CODE_mcp-tool-doctor.md](backlog/bad-code/CLEAN_CODE_mcp-tool-doctor.md)
- [CLEAN_CODE_mcp-runtime-observability-composition.md](backlog/bad-code/CLEAN_CODE_mcp-runtime-observability-composition.md)
- [WARP_background-indexing.md](backlog/cool-ideas/WARP_background-indexing.md)

Depends on:
- Packet 3

Subsequence:
1. Route monitor ticks through the scheduler at lower priority.
2. Surface per-repo backlog, lag, and recent execution cost.
3. Make queue saturation and scheduler-unavailable behavior explicit.
4. Use the `graft_map` overflow feedback as the first pressure witness.

Effort: M
Risk: M

### Packet 5. Same-repo concurrency and logical writer lanes
Backlog docs:
- [WARP_logical-writer-lanes.md](backlog/up-next/WARP_logical-writer-lanes.md)
- [WARP_same-repo-concurrent-agent-model.md](backlog/up-next/WARP_same-repo-concurrent-agent-model.md)
- [CLEAN_CODE_warp-indexer.md](backlog/bad-code/CLEAN_CODE_warp-indexer.md)

Depends on:
- Packet 3
- Packet 4

Subsequence:
1. Define lane-owned writer IDs for repo-local mutation streams.
2. Separate writer identity from worker identity.
3. Document lawful same-repo concurrency and collision posture.
4. Update receipts and observability to expose lane identity.

Effort: M
Risk: H

## Phase 2: WARP Temporal Memory

### Packet 6. Provenance and durable local history
Backlog docs:
- [WARP_persisted-sub-commit-local-history.md](backlog/up-next/WARP_persisted-sub-commit-local-history.md)
- [WARP_provenance-attribution-instrumentation.md](backlog/up-next/WARP_provenance-attribution-instrumentation.md)
- [WARP_agent-action-provenance.md](backlog/cool-ideas/WARP_agent-action-provenance.md)
- [WARP_provenance-dag.md](backlog/cool-ideas/WARP_provenance-dag.md)
- [WARP_causal-write-tracking.md](backlog/cool-ideas/WARP_causal-write-tracking.md)
- [WARP_outline-diff-commit-trailer.md](backlog/cool-ideas/WARP_outline-diff-commit-trailer.md)

Depends on:
- Packet 5

Subsequence:
1. Persist local structural history between Git commits.
2. Attach provenance metadata to structural writes and monitor jobs.
3. Expose a bounded provenance story in receipts and diagnostics.
4. Keep the first version repo-local before expanding cross-repo links.

Effort: L
Risk: H

### Packet 7. Reactive overlays and richer transitions
Backlog docs:
- [WARP_reactive-workspace-overlay.md](backlog/up-next/WARP_reactive-workspace-overlay.md)
- [WARP_richer-semantic-transitions.md](backlog/up-next/WARP_richer-semantic-transitions.md)
- [WARP_temporal-structural-search.md](backlog/cool-ideas/WARP_temporal-structural-search.md)
- [WARP_symbol-history-timeline.md](backlog/cool-ideas/WARP_symbol-history-timeline.md)
- [WARP_graft-since.md](backlog/cool-ideas/WARP_graft-since.md)
- [WARP_reasoning-trace-replay.md](backlog/cool-ideas/WARP_reasoning-trace-replay.md)

Depends on:
- Packet 6

Subsequence:
1. Make overlay state more reactive and less polling-shaped.
2. Strengthen semantic transition modeling on top of the new history.
3. Add time-aware views that remain bounded and machine-readable.
4. Prove the model with symbol- and repo-level timeline queries.

Effort: L
Risk: H

## Phase 3: Precision and Refactor Intelligence

### Packet 8. Reference tracing and symbol identity
Backlog docs:
- [WARP_symbol-identity-and-rename-continuity.md](backlog/up-next/WARP_symbol-identity-and-rename-continuity.md)
- [WARP_symbol-reference-tracing.md](backlog/cool-ideas/WARP_symbol-reference-tracing.md)
- [WARP_name-based-symbol-matching.md](backlog/bad-code/WARP_name-based-symbol-matching.md)
- [CLEAN_CODE_mcp-tool-code-find-orchestration.md](backlog/bad-code/CLEAN_CODE_mcp-tool-code-find-orchestration.md)
- [CLEAN_CODE_mcp-tool-code-show.md](backlog/bad-code/CLEAN_CODE_mcp-tool-code-show.md)
- [CLEAN_CODE_mcp-tool-code-refs.md](backlog/bad-code/CLEAN_CODE_mcp-tool-code-refs.md)
- [CLEAN_CODE_mcp-tool-precision-helper-composition.md](backlog/bad-code/CLEAN_CODE_mcp-tool-precision-helper-composition.md)
- [CLEAN_CODE_mcp-tool-precision-query-policy.md](backlog/bad-code/CLEAN_CODE_mcp-tool-precision-query-policy.md)

Depends on:
- Packet 6
- Packet 7

Subsequence:
1. Move from name-only matching toward stable symbol identity.
2. Add lawful reference tracing against that identity model.
3. Keep fallback search behavior explicit when identity resolution fails.
4. Retire the current precision debt around orchestration and policy.

Effort: L
Risk: H

### Packet 9. Impact prediction and change analysis primitives
Backlog docs:
- [WARP_structural-impact-prediction.md](backlog/cool-ideas/WARP_structural-impact-prediction.md)
- [WARP_refactor-difficulty-score.md](backlog/cool-ideas/WARP_refactor-difficulty-score.md)
- [WARP_export-surface-diff.md](backlog/cool-ideas/WARP_export-surface-diff.md)
- [WARP_structural-blame.md](backlog/cool-ideas/WARP_structural-blame.md)
- [WARP_structural-churn-report.md](backlog/cool-ideas/WARP_structural-churn-report.md)
- [WARP_symbol-heatmap.md](backlog/cool-ideas/WARP_symbol-heatmap.md)
- [WARP_dead-symbol-detection.md](backlog/cool-ideas/WARP_dead-symbol-detection.md)

Depends on:
- Packet 8

Subsequence:
1. Derive impact edges from symbol identity and provenance.
2. Introduce blast-radius, churn, and difficulty scoring.
3. Expose bounded inspection surfaces for those scores.
4. Use them as building blocks for review and rename packets.

Effort: M
Risk: M

### Packet 10. Rename and automated refactor surface
Backlog docs:
- [SURFACE_offer-rename-refactor.md](backlog/cool-ideas/SURFACE_offer-rename-refactor.md)
- [WARP_counterfactual-refactoring.md](backlog/cool-ideas/WARP_counterfactual-refactoring.md)
- [WARP_optic-based-refactoring.md](backlog/cool-ideas/WARP_optic-based-refactoring.md)
- [WARP_reversible-structural-edits.md](backlog/cool-ideas/WARP_reversible-structural-edits.md)
- [WARP_speculative-merge.md](backlog/cool-ideas/WARP_speculative-merge.md)

Depends on:
- Packet 8
- Packet 9

Subsequence:
1. Start with rename suggestion and preview, not blind write execution.
2. Build reversible structural edit plans.
3. Layer counterfactual and speculative preview modes afterward.
4. Keep the first operator-facing surface narrow and inspectable.

Effort: L
Risk: H

## Phase 4: Agent Workflow and Policy UX

### Packet 11. Orientation and startup ergonomics
Backlog docs:
- [CORE_conversation-primer.md](backlog/cool-ideas/CORE_conversation-primer.md)
- [CORE_codebase-orientation-map.md](backlog/cool-ideas/CORE_codebase-orientation-map.md)
- [CORE_tool-name-namespacing.md](backlog/cool-ideas/CORE_tool-name-namespacing.md)
- [SURFACE_non-codex-instruction-bootstrap-parity.md](backlog/cool-ideas/SURFACE_non-codex-instruction-bootstrap-parity.md)
- [CLEAN_CODE_cli-main.md](backlog/bad-code/CLEAN_CODE_cli-main.md)
- [CLEAN_CODE_cli-init-bootstrap-composition.md](backlog/bad-code/CLEAN_CODE_cli-init-bootstrap-composition.md)
- [CLEAN_CODE_bin-graft-entrypoint.md](backlog/bad-code/CLEAN_CODE_bin-graft-entrypoint.md)
- [CLEAN_CODE_cli-default-stdio-surprise.md](backlog/bad-code/CLEAN_CODE_cli-default-stdio-surprise.md)
- [CLEAN_CODE_cli-error-actionability.md](backlog/bad-code/CLEAN_CODE_cli-error-actionability.md)

Depends on:
- Packet 3

Subsequence:
1. Make first-run guidance and tool naming coherent.
2. Give agents a lawful orientation path before raw file reads.
3. Normalize bootstrap posture across supported clients.
4. Retire CLI surprise and actionability debt while touching the path.

Effort: M
Risk: L

### Packet 12. Session continuity and drift control
Backlog docs:
- [CORE_cross-session-resume.md](backlog/cool-ideas/CORE_cross-session-resume.md)
- [CORE_structural-session-replay.md](backlog/cool-ideas/CORE_structural-session-replay.md)
- [CORE_agent-drift-warning.md](backlog/cool-ideas/CORE_agent-drift-warning.md)
- [CORE_sludge-detector.md](backlog/cool-ideas/CORE_sludge-detector.md)
- [CORE_auto-focus.md](backlog/cool-ideas/CORE_auto-focus.md)
- [CORE_capture-range.md](backlog/cool-ideas/CORE_capture-range.md)
- [CORE_multi-agent-conflict-detection.md](backlog/cool-ideas/CORE_multi-agent-conflict-detection.md)
- [WARP_session-filtration.md](backlog/cool-ideas/WARP_session-filtration.md)
- [WARP_semantic-drift-in-sessions.md](backlog/cool-ideas/WARP_semantic-drift-in-sessions.md)

Depends on:
- Packet 6
- Packet 11

Subsequence:
1. Make session state replayable across restarts.
2. Detect drift, sludge, and conflicting concurrent work.
3. Add bounded focus and capture tools after replay is trustworthy.
4. Keep warnings explainable and operator-visible.

Effort: M
Risk: M

### Packet 13. Policy tuning and context economics
Backlog docs:
- [CORE_policy-profiles.md](backlog/cool-ideas/CORE_policy-profiles.md)
- [CORE_self-tuning-governor.md](backlog/cool-ideas/CORE_self-tuning-governor.md)
- [CORE_lagrangian-policy.md](backlog/cool-ideas/CORE_lagrangian-policy.md)
- [CORE_speculative-read-cost.md](backlog/cool-ideas/CORE_speculative-read-cost.md)
- [CORE_horizon-of-readability.md](backlog/cool-ideas/CORE_horizon-of-readability.md)
- [WARP_budget-elasticity.md](backlog/cool-ideas/WARP_budget-elasticity.md)
- [WARP_projection-safety-classes.md](backlog/cool-ideas/WARP_projection-safety-classes.md)
- [WARP_intentional-degeneracy-privacy.md](backlog/cool-ideas/WARP_intentional-degeneracy-privacy.md)

Depends on:
- Packet 12

Subsequence:
1. Split policy into explicit operator-selectable profiles.
2. Add tuning based on measured read cost and session outcomes.
3. Make projection safety and privacy classes explicit.
4. Only then experiment with self-tuning behavior.

Effort: L
Risk: M

## Phase 5: Review and Code-Health Intelligence

### Packet 14. Review surfaces
Backlog docs:
- [CORE_pr-review-structural-summary.md](backlog/cool-ideas/CORE_pr-review-structural-summary.md)
- [CORE_structural-test-coverage-map.md](backlog/cool-ideas/CORE_structural-test-coverage-map.md)
- [WARP_zero-noise-code-review.md](backlog/cool-ideas/WARP_zero-noise-code-review.md)
- [WARP_auto-breaking-change-detection.md](backlog/cool-ideas/WARP_auto-breaking-change-detection.md)
- [WARP_stale-docs-checker.md](backlog/cool-ideas/WARP_stale-docs-checker.md)
- [WARP_semantic-merge-conflict-prediction.md](backlog/cool-ideas/WARP_semantic-merge-conflict-prediction.md)

Depends on:
- Packet 9

Subsequence:
1. Build bounded review summaries on top of impact and provenance.
2. Add test-coverage and stale-doc support as secondary lenses.
3. Add breaking-change and merge-conflict prediction afterward.
4. Keep the surface noise-minimized and auditable.

Effort: M
Risk: M

### Packet 15. Code-health and debt signal layer
Backlog docs:
- [WARP_technical-debt-curvature.md](backlog/cool-ideas/WARP_technical-debt-curvature.md)
- [WARP_codebase-entropy-trajectory.md](backlog/cool-ideas/WARP_codebase-entropy-trajectory.md)
- [WARP_codebase-signature.md](backlog/cool-ideas/WARP_codebase-signature.md)
- [WARP_degeneracy-warning.md](backlog/cool-ideas/WARP_degeneracy-warning.md)
- [CORE_constructor-in-disguise-lint.md](backlog/cool-ideas/CORE_constructor-in-disguise-lint.md)

Depends on:
- Packet 14

Subsequence:
1. Establish code-health measurements with bounded, machine-readable
   outputs.
2. Add repo-level entropy and degeneracy signals.
3. Add specific structural lint-like checks last.

Effort: M
Risk: L

## Phase 6: Research and Expansion

### Packet 16. Cross-repo and distributed substrate
Backlog docs:
- [WARP_cross-repo-dependency-tracking.md](backlog/cool-ideas/WARP_cross-repo-dependency-tracking.md)
- [WARP_graft-pack.md](backlog/cool-ideas/WARP_graft-pack.md)
- [WARP_fuse-strand-filesystem.md](backlog/cool-ideas/WARP_fuse-strand-filesystem.md)
- [WARP_shadow-structural-workspaces.md](backlog/cool-ideas/WARP_shadow-structural-workspaces.md)
- [WARP_footprint-parallelism.md](backlog/cool-ideas/WARP_footprint-parallelism.md)

Depends on:
- Packet 6
- Packet 15

Subsequence:
1. Prove repo-local and same-repo models first.
2. Add cross-repo graph links and packaging only after provenance is
   stable.
3. Explore virtualized or shadow workspaces after distribution exists.

Effort: XL
Risk: H

### Packet 17. Advanced projection and reasoning experiments
Backlog docs:
- [WARP_adaptive-projection-selection.md](backlog/cool-ideas/WARP_adaptive-projection-selection.md)
- [WARP_minimum-viable-context.md](backlog/cool-ideas/WARP_minimum-viable-context.md)
- [WARP_multi-interpretation-tools.md](backlog/cool-ideas/WARP_multi-interpretation-tools.md)
- [WARP_eternal-structural-audit-log.md](backlog/cool-ideas/WARP_eternal-structural-audit-log.md)
- [WARP_structural-drift-detection.md](backlog/cool-ideas/WARP_structural-drift-detection.md)
- [WARP_rulial-heat-map.md](backlog/cool-ideas/WARP_rulial-heat-map.md)

Depends on:
- Packet 13
- Packet 15

Subsequence:
1. Use the mature policy/projection substrate as the baseline.
2. Add adaptive projection only after safety classes are explicit.
3. Add richer reasoning and audit experiments last.

Effort: L
Risk: H

### Packet 18. Speculative and teaching surfaces
Backlog docs:
- [CORE_git-graft-enhance.md](backlog/cool-ideas/CORE_git-graft-enhance.md)
- [CORE_graft-as-teacher.md](backlog/cool-ideas/CORE_graft-as-teacher.md)
- [CORE_stale-coderabbit-check-workaround.md](backlog/cool-ideas/CORE_stale-coderabbit-check-workaround.md)

Depends on:
- Packet 12
- Packet 14

Subsequence:
1. Keep these explicitly post-core and post-review surfaces.
2. Start with small operator-assist utilities.
3. Only then explore teaching or guidance-heavy experiences.

Effort: M
Risk: M

## Summary Order

1. Packet 1. Async Git closeout
2. Packet 2. Async filesystem on daemon request paths
3. Packet 3. Scheduler contract and worker pool
4. Packet 4. Monitors through the scheduler
5. Packet 5. Same-repo concurrency and logical writer lanes
6. Packet 6. Provenance and durable local history
7. Packet 7. Reactive overlays and richer transitions
8. Packet 8. Reference tracing and symbol identity
9. Packet 9. Impact prediction and change analysis primitives
10. Packet 10. Rename and automated refactor surface
11. Packet 11. Orientation and startup ergonomics
12. Packet 12. Session continuity and drift control
13. Packet 13. Policy tuning and context economics
14. Packet 14. Review surfaces
15. Packet 15. Code-health and debt signal layer
16. Packet 16. Cross-repo and distributed substrate
17. Packet 17. Advanced projection and reasoning experiments
18. Packet 18. Speculative and teaching surfaces

## Recommended Pull Order Right Now

If we want the shortest lawful next moves from the current state:

1. Packet 2
2. Packet 3
3. Packet 4
4. Packet 5
5. Packet 6

That is the highest-leverage chain because each step unlocks the next
domain without building policy or product UX on top of blocking daemon
substrate.

## Cross-Cutting Debt Attachments

These cards should be retired inside the packets below rather than
treated as standalone epics.

Attach to Packet 3 or Packet 4:
- [CLEAN_CODE_contracts-output-schemas.md](backlog/bad-code/CLEAN_CODE_contracts-output-schemas.md)
- [CLEAN_CODE_mcp-receipt.md](backlog/bad-code/CLEAN_CODE_mcp-receipt.md)
- [CLEAN_CODE_metrics-types.md](backlog/bad-code/CLEAN_CODE_metrics-types.md)
- [CLEAN_CODE_ports-codec.md](backlog/bad-code/CLEAN_CODE_ports-codec.md)

Attach to Packet 7 or Packet 9:
- [CLEAN_CODE_mcp-tool-graft-diff.md](backlog/bad-code/CLEAN_CODE_mcp-tool-graft-diff.md)
- [CLEAN_CODE_mcp-tool-since.md](backlog/bad-code/CLEAN_CODE_mcp-tool-since.md)
- [CLEAN_CODE_operations-graft-diff.md](backlog/bad-code/CLEAN_CODE_operations-graft-diff.md)
- [CLEAN_CODE_mcp-tool-map-collector-orchestration.md](backlog/bad-code/CLEAN_CODE_mcp-tool-map-collector-orchestration.md)
- [CLEAN_CODE_parser-lang.md](backlog/bad-code/CLEAN_CODE_parser-lang.md)
- [CLEAN_CODE_parser-outline.md](backlog/bad-code/CLEAN_CODE_parser-outline.md)

Attach to Packet 11 or Packet 12:
- [CLEAN_CODE_cli-index-cmd.md](backlog/bad-code/CLEAN_CODE_cli-index-cmd.md)
- [CLEAN_CODE_cli-init-test-fixtures.md](backlog/bad-code/CLEAN_CODE_cli-init-test-fixtures.md)
- [CLEAN_CODE_hook-read-test-fixtures.md](backlog/bad-code/CLEAN_CODE_hook-read-test-fixtures.md)

Attach to Packet 13:
- [CLEAN_CODE_mcp-tool-budget.md](backlog/bad-code/CLEAN_CODE_mcp-tool-budget.md)
- [CLEAN_CODE_mcp-tool-state.md](backlog/bad-code/CLEAN_CODE_mcp-tool-state.md)
- [CLEAN_CODE_operations-state.md](backlog/bad-code/CLEAN_CODE_operations-state.md)
- [CLEAN_CODE_mcp-tool-explain.md](backlog/bad-code/CLEAN_CODE_mcp-tool-explain.md)

Attach to Packet 3 or Packet 11:
- [CLEAN_CODE_mcp-tool-run-capture.md](backlog/bad-code/CLEAN_CODE_mcp-tool-run-capture.md)
