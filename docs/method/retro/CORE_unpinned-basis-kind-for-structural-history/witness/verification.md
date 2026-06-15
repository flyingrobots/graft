---
title: "Verification Witness for Cycle CORE_unpinned-basis-kind-for-structural-history"
---

# Verification Witness for Cycle CORE_unpinned-basis-kind-for-structural-history

This witness proves that `Unpinned committed-history bases deserve their own basis kind` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.9.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/parser/outline.test.ts (26 tests) 115ms
 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 826ms
     ✓ retains full read-event history in the WARP graph  762ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 2986ms
     ✓ writes correlated start and completion events for tool calls  337ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  302ms
 ✓ test/unit/cli/init.test.ts (29 tests) 186ms
 ✓ test/unit/echo/generated-model-parity.test.ts (37 tests) 62ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 4890ms
     ✓ tracks session depth across tool calls  380ms
 ✓ test/unit/cli/main.test.ts (20 tests) 1826ms
     ✓ runs peer commands through the grouped CLI surface  346ms
     ✓ runs symbol difficulty through the grouped CLI surface  514ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 2909ms
     ✓ returns an explicit ambiguity response when multiple symbols match  363ms
     ✓ uses WARP for indexed historical reads  346ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 2703ms
       ✓ labels historical symbol reads as commit_worldline  659ms
       ✓ keeps checkout epochs unique across repeated branch flips  354ms
 ✓ test/unit/contracts/graft-structural-history-schema.test.ts (15 tests) 468ms
 ✓ test/unit/warp/lsp-semantic-enrichment.test.ts (13 tests) 1908ms
     ✓ edge case: clears stale semantic facts when a later explicit index emits none  399ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 3532ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  854ms
     ✓ offloads dirty precision lookups through child-process workers  757ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  1777ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 990ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 70ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 1018ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 22ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 13285ms
     ✓ validates representative MCP tool outputs against the declared schemas  2646ms
     ✓ validates representative CLI peer outputs against the declared schemas  10301ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1501ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1018ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  335ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 991ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  405ms
 ✓ test/unit/mcp/workspace-binding.test.ts (12 tests) 1888ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  309ms
     ✓ routes heavy daemon repo tools through the scheduler  318ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  542ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 41ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (7 tests) 5034ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1170ms
     ✓ runs an offloaded repo tool on a child-process worker  1009ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  924ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  914ms
     ✓ runs dirty code_find through the live worker path  862ms
 ✓ test/unit/operations/structural-test-coverage-map.test.ts (5 tests) 309ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 78ms
 ✓ tests/playback/SURFACE_opened-workspace-paths.test.ts (7 tests) 2136ms
     ✓ Can a repo-local MCP server open a second git worktree and run `safe_read`, `graft_map`, and `code_find` against it without process restart?  578ms
     ✓ Does activation reset session-local cache, budget, saved state, metrics, and repo-state tracking instead of bleeding state across worktrees?  450ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 92ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 66ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 541ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 867ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 2989ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1154ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 2595ms
     ✓ diff includes removed symbols  347ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 576ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 36ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 991ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  918ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 1379ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  415ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 263ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1157ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1059ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 36ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 1417ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  723ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  418ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 537ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 162ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 593ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 1038ms
     ✓ detects last signature change across commits  350ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 2782ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 31ms
 ✓ test/unit/git/diff.test.ts (17 tests) 455ms
 ✓ test/unit/warp/structural-reading-adapter.test.ts (5 tests) 33ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 31ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 82ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 1638ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 34ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 45ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 1128ms
       ✓ returns removed symbols when a function is deleted  348ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 46ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 40ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 32ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 829ms
       ✓ flags a symbol that changed after the doc was committed  319ms
 ✓ tests/playback/CORE_v080-scope-formation.test.ts (6 tests) 32ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (4 tests) 40ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 31ms
 ✓ tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts (9 tests) 30ms
 ✓ test/unit/mcp/opened-workspaces.test.ts (5 tests) 833ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 36ms
 ✓ test/unit/mcp/map-truncation.test.ts (5 tests) 1088ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  313ms
 ✓ test/unit/warp/since.test.ts (3 tests) 935ms
     ✓ detects added symbols between two commits  313ms
     ✓ detects removed symbols between two commits  365ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 1015ms
     ✓ detects a stale symbol reference after signature change  322ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 39ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 805ms
 ✓ tests/playback/CORE_unpinned-basis-kind-for-structural-history.test.ts (6 tests) 35ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 653ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  424ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 31ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 32ms
 ✓ test/unit/ports/structural-reading.test.ts (4 tests) 33ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 30ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 3229ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  2774ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 881ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 39ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 30ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 1697ms
     ✓ detects a symbol removed and not re-added  399ms
     ✓ excludes symbols that were removed then re-added  362ms
     ✓ respects maxCommits to limit search depth  389ms
     ✓ detects removals across multiple files  342ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 35ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 34ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 1497ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  913ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  556ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 33ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 34ms
 ✓ test/unit/warp/context.test.ts (8 tests) 34ms
 ✓ test/unit/cli/doctor-posture.test.ts (7 tests) 970ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 28ms
 ✓ test/integration/safe-read.test.ts (9 tests) 83ms
 ✓ test/unit/scripts/docker-autostart.test.ts (6 tests) 33ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 37ms
 ✓ test/unit/parser/lang.test.ts (15 tests) 30ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 30ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 107ms
 ✓ test/unit/release/docker-test-isolation.test.ts (6 tests) 30ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 30ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 48ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 55ms
 ✓ test/unit/warp/warp-structural-log.test.ts (6 tests) 1037ms
     ✓ respects limit parameter  567ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 31ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 1152ms
     ✓ combines aggregate churn curvature with reference friction  616ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 977ms
     ✓ counts references from multiple importing files  306ms
     ✓ distinguishes same-named symbols in different files  338ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 1434ms
     ✓ tracks multiple files  329ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (7 tests) 36ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 41ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 34ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 33ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 34ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 2819ms
     ✓ renders a human review summary for enhance --since in a temp repo  861ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  490ms
     ✓ supports Git external-command invocation through git graft in a temp repo  1443ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 1182ms
     ✓ finds multiple referencing files  404ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 30ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 41ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (6 tests) 703ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 329ms
 ✓ test/unit/echo/obstruction-mapping.test.ts (10 tests) 38ms
 ✓ tests/playback/CORE_pr-review-structural-summary.test.ts (2 tests) 598ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 592ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 29ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 52ms
 ✓ test/unit/echo/wire-strictness.test.ts (4 tests) 33ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (4 tests) 31ms
 ✓ tests/playback/CORE_graft-doctor.test.ts (6 tests) 856ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 367ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  331ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 165ms
 ✓ test/unit/library/index.test.ts (5 tests) 1124ms
     ✓ keeps sync projection bundles non-throwing before parser warmup  862ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 81ms
 ✓ tests/playback/CORE_structural-test-coverage-map.test.ts (2 tests) 412ms
 ✓ tests/playback/SURFACE_capability-matrix-truth.test.ts (6 tests) 32ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 32ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 505ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 41ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 51ms
 ✓ test/unit/cli/command-parser.test.ts (8 tests) 32ms
 ✓ test/unit/echo/authority-boundary.test.ts (5 tests) 31ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 176ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 30ms
 ✓ test/unit/operations/review-cooldown-status.test.ts (6 tests) 31ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 30ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 80ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 74ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 971ms
     ✓ tracks signature changes in blame history  388ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 70ms
 ✓ test/unit/contracts/graft-structural-history-echo-package.test.ts (3 tests) 33ms
 ✓ test/unit/echo/query-through-app.test.ts (3 tests) 43ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 40ms
 ✓ test/unit/mcp/structural-blame.test.ts (2 tests) 942ms
     ✓ returns per-version path and line ranges for symbol history entries  540ms
     ✓ keeps paths on removed history entries without requiring line ranges  367ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 178ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 30ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 28ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 34ms
 ✓ tests/playback/WARP_symbol-history-timeline.test.ts (1 test) 908ms
     ✓ Can I read a human symbol timeline from indexed WARP history?  883ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 766ms
 ✓ tests/playback/SURFACE_review-cooldown-status.test.ts (2 tests) 72ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 36ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 31ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 29ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 29ms
 ✓ test/unit/echo/structural-history-codec.test.ts (6 tests) 29ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 44ms
 ✓ test/unit/echo/intent-flow.test.ts (7 tests) 32ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 32ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 70ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 30ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (3 tests) 30ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 31ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 32ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 48ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 31ms
 ✓ test/unit/mcp/context-guard.test.ts (8 tests) 33ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 51ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 29ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 29ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 244ms
 ✓ test/unit/release/package-docs.test.ts (3 tests) 108ms
 ✓ test/unit/cli/index-cmd.test.ts (3 tests) 181ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 2794ms
     ✓ monitor nudge triggers an immediate tick that indexes  2509ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 288ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 33ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 34ms
 ✓ tests/playback/WARP_dead-symbol-detection.test.ts (1 test) 1189ms
     ✓ Can I list symbols removed from indexed history and not re-added?  1159ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 33ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 33ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 31ms
 ✓ test/unit/operations/state.test.ts (5 tests) 41ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 32ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 103ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 210ms
 ✓ test/unit/cli/structural-blame-render.test.ts (2 tests) 46ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 29ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 29ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 299ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 88ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 33ms
 ✓ test/unit/release/package-library-surface.test.ts (6 tests) 38ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 39ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 112ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 169ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 33ms
 ✓ test/unit/cli/structural-test-coverage-render.test.ts (1 test) 36ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 31ms
 ✓ test/unit/release/v080-witness.test.ts (3 tests) 33ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 30ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 29ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 30ms
 ✓ test/unit/mcp/structural-review-cold-warp.test.ts (1 test) 222ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 61ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (2 tests) 32ms
 ✓ test/unit/warp/sym-id-codec.test.ts (5 tests) 34ms
 ✓ test/unit/cli/structural-review-render.test.ts (1 test) 39ms
 ✓ test/unit/git/version-guard.test.ts (4 tests) 32ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 30ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 171ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 32ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 30ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 36ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 28ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 30ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 31ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 28ms
 ✓ test/unit/echo/determinism.test.ts (1 test) 29ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (4 tests) 31ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 30ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 41ms
 ✓ test/unit/warp/open.test.ts (2 tests) 188ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 35ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 66ms
 ✓ test/unit/release/code-standards.test.ts (1 test) 32ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 55ms
 ✓ test/unit/cli/dead-symbols-render.test.ts (1 test) 57ms
 ✓ test/unit/parser/extractor-common.test.ts (1 test) 33ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 48ms
 ✓ test/unit/version.test.ts (1 test) 32ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 289ms

 Test Files  234 passed (234)
      Tests  1724 passed (1724)
   Start at  10:50:20
   Duration  96.90s (transform 3.99s, setup 6.72s, import 45.24s, tests 117.74s, environment 21ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.27kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.8s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:9385cd9f3001dfc3431e8ead12c43e9e1f87cc1b9b5c6cfd0f73865d405b27c4
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 472.19kB 0.1s done
#5 DONE 0.1s

#6 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#6 CACHED

#7 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#7 CACHED

#8 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#8 CACHED

#9 [deps 2/6] WORKDIR /app
#9 CACHED

#10 [deps 3/6] RUN apk add --no-cache git
#10 CACHED

#11 [build 1/3] WORKDIR /app
#11 CACHED

#12 [build 2/3] COPY . .
#12 DONE 0.5s

#13 [build 3/3] RUN pnpm build
#13 0.500
#13 0.500 > @flyingrobots/graft@0.9.0 build /app
#13 0.500 > tsc -p tsconfig.build.json
#13 0.500
#13 DONE 7.3s

#14 exporting to image
#14 exporting layers 0.1s done
#14 writing image sha256:26763517fb2c7c27c8ee4ccab190edbeecf2e1207c592bbf676afaa8565c2b8e done
#14 naming to docker.io/library/graft-test:local done
#14 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/moqadqvmjobvxd4iajtnyyfp9

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 6 playback questions, 312 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_unpinned-basis-kind-for-structural-history`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_unpinned-basis-kind-for-structural-history
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
