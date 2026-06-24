---
title: "Verification Witness for Cycle SURFACE_colorful-prose-extractor"
---

# Verification Witness for Cycle SURFACE_colorful-prose-extractor

This witness proves that `SURFACE: Colorful prose extractor` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.9.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/parser/outline.test.ts (26 tests) 93ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 2538ms
 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 921ms
     ✓ retains full read-event history in the WARP graph  851ms
 ✓ test/unit/mcp/tools.test.ts (35 tests) 4274ms
     ✓ tracks session depth across tool calls  375ms
 ✓ test/unit/mcp/workspace-registry.test.ts (18 tests) 628ms
 ✓ test/unit/cli/init.test.ts (29 tests) 146ms
 ✓ test/unit/echo/generated-model-parity.test.ts (37 tests) 65ms
 ✓ test/unit/cli/main.test.ts (20 tests) 1536ms
     ✓ runs symbol difficulty through the grouped CLI surface  420ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 2389ms
     ✓ returns an explicit ambiguity response when multiple symbols match  346ms
     ✓ uses WARP for indexed historical reads  327ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 2495ms
       ✓ labels historical symbol reads as commit_worldline  581ms
 ✓ test/unit/contracts/graft-structural-history-schema.test.ts (15 tests) 453ms
 ✓ test/unit/warp/lsp-semantic-enrichment.test.ts (13 tests) 1148ms
 ✓ test/unit/contracts/workspace-store-slice0-contract.test.ts (10 tests) 37ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 3171ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  766ms
     ✓ offloads dirty precision lookups through child-process workers  878ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  1432ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 882ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 69ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 909ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 12ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 10533ms
     ✓ validates representative MCP tool outputs against the declared schemas  2244ms
     ✓ validates representative CLI peer outputs against the declared schemas  8080ms
 ✓ test/unit/library/structured-buffer.test.ts (8 tests) 69ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1072ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  674ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  302ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 757ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  316ms
 ✓ test/unit/mcp/workspace-binding.test.ts (12 tests) 1411ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  370ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 37ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (7 tests) 3359ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  759ms
     ✓ runs an offloaded repo tool on a child-process worker  674ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  642ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  615ms
     ✓ runs dirty code_find through the live worker path  645ms
 ✓ test/unit/operations/structural-test-coverage-map.test.ts (5 tests) 210ms
 ✓ tests/playback/SURFACE_opened-workspace-paths.test.ts (7 tests) 1642ms
     ✓ Can a repo-local MCP server open a second git worktree and run `safe_read`, `graft_map`, and `code_find` against it without process restart?  434ms
     ✓ Does activation reset session-local cache, budget, saved state, metrics, and repo-state tracking instead of bleeding state across worktrees?  330ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 68ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 54ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 505ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 714ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 2558ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1013ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 2379ms
     ✓ diff includes removed symbols  301ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 525ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 32ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 1238ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  394ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 873ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  807ms
 ✓ test/unit/release/docker-test-isolation.test.ts (9 tests) 41ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 229ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1047ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 986ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 30ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 475ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 1345ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  667ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  400ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 138ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 508ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 952ms
     ✓ detects last signature change across commits  309ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 2428ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 28ms
 ✓ test/unit/git/diff.test.ts (17 tests) 406ms
 ✓ test/unit/warp/structural-reading-adapter.test.ts (5 tests) 30ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 29ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 74ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 1530ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 30ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 40ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 987ms
       ✓ returns removed symbols when a function is deleted  323ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 40ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 31ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 27ms
 ✓ tests/playback/CORE_v080-scope-formation.test.ts (6 tests) 30ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 695ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (4 tests) 37ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 28ms
 ✓ tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts (9 tests) 28ms
 ✓ test/unit/mcp/opened-workspaces.test.ts (5 tests) 742ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 30ms
 ✓ test/unit/mcp/map-truncation.test.ts (5 tests) 956ms
 ✓ test/unit/warp/since.test.ts (3 tests) 875ms
     ✓ detects removed symbols between two commits  339ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 977ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 37ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 780ms
 ✓ tests/playback/CORE_unpinned-basis-kind-for-structural-history.test.ts (6 tests) 29ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 641ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  384ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 29ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 28ms
 ✓ test/unit/ports/structural-reading.test.ts (4 tests) 27ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 26ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 3063ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  2625ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 833ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 36ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 28ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 1537ms
     ✓ detects a symbol removed and not re-added  365ms
     ✓ excludes symbols that were removed then re-added  365ms
     ✓ respects maxCommits to limit search depth  321ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 34ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 28ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 1296ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  828ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  444ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 27ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 31ms
 ✓ test/unit/cli/doctor-posture.test.ts (7 tests) 780ms
 ✓ test/unit/warp/context.test.ts (8 tests) 28ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 27ms
 ✓ test/integration/safe-read.test.ts (9 tests) 77ms
 ✓ test/unit/scripts/docker-autostart.test.ts (6 tests) 28ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 35ms
 ✓ test/unit/parser/lang.test.ts (15 tests) 29ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 28ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 103ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 28ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 42ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 47ms
 ✓ test/unit/warp/warp-structural-log.test.ts (6 tests) 984ms
     ✓ respects limit parameter  540ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 28ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 1059ms
     ✓ combines aggregate churn curvature with reference friction  571ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 908ms
     ✓ distinguishes same-named symbols in different files  322ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 1310ms
     ✓ tracks multiple files  333ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (7 tests) 31ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 37ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 29ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 29ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 30ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 2655ms
     ✓ renders a human review summary for enhance --since in a temp repo  817ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  451ms
     ✓ supports Git external-command invocation through git graft in a temp repo  1365ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 1110ms
     ✓ finds multiple referencing files  406ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 26ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 40ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (6 tests) 691ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 287ms
 ✓ test/unit/echo/obstruction-mapping.test.ts (10 tests) 32ms
 ✓ tests/playback/CORE_pr-review-structural-summary.test.ts (2 tests) 523ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 541ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 28ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 48ms
 ✓ test/unit/echo/wire-strictness.test.ts (4 tests) 30ms
 ✓ test/unit/operations/colorful-prose-projection.test.ts (2 tests) 29ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (4 tests) 28ms
 ✓ tests/playback/CORE_graft-doctor.test.ts (6 tests) 774ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 370ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  337ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 152ms
 ✓ test/unit/library/index.test.ts (5 tests) 1030ms
     ✓ keeps sync projection bundles non-throwing before parser warmup  789ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 68ms
 ✓ tests/playback/CORE_structural-test-coverage-map.test.ts (2 tests) 361ms
 ✓ tests/playback/SURFACE_capability-matrix-truth.test.ts (6 tests) 29ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 32ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 463ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 38ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 46ms
 ✓ test/unit/cli/command-parser.test.ts (8 tests) 28ms
 ✓ test/unit/echo/authority-boundary.test.ts (5 tests) 28ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 161ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 26ms
 ✓ test/unit/operations/review-cooldown-status.test.ts (6 tests) 28ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 30ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 74ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 57ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 818ms
     ✓ tracks signature changes in blame history  326ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 59ms
 ✓ test/unit/contracts/graft-structural-history-echo-package.test.ts (3 tests) 30ms
 ✓ test/unit/echo/query-through-app.test.ts (3 tests) 40ms
 ✓ test/unit/mcp/structural-blame.test.ts (2 tests) 836ms
     ✓ returns per-version path and line ranges for symbol history entries  450ms
     ✓ keeps paths on removed history entries without requiring line ranges  363ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 35ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 150ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 29ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 26ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 34ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 30ms
 ✓ tests/playback/WARP_symbol-history-timeline.test.ts (1 test) 831ms
     ✓ Can I read a human symbol timeline from indexed WARP history?  809ms
 ✓ tests/playback/SURFACE_review-cooldown-status.test.ts (2 tests) 65ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 671ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 27ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 29ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 26ms
 ✓ test/unit/echo/structural-history-codec.test.ts (6 tests) 28ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 44ms
 ✓ test/unit/echo/intent-flow.test.ts (7 tests) 28ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 30ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 59ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 26ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (3 tests) 26ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 28ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 30ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 44ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 28ms
 ✓ test/unit/mcp/context-guard.test.ts (8 tests) 29ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 44ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 25ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 28ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 205ms
 ✓ test/unit/release/package-docs.test.ts (3 tests) 54ms
 ✓ test/unit/cli/index-cmd.test.ts (3 tests) 140ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 2703ms
     ✓ monitor nudge triggers an immediate tick that indexes  2469ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 220ms
 ✓ tests/playback/WARP_dead-symbol-detection.test.ts (1 test) 958ms
     ✓ Can I list symbols removed from indexed history and not re-added?  935ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 27ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 29ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 28ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 27ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 28ms
 ✓ test/unit/operations/state.test.ts (5 tests) 31ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 27ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 90ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 147ms
 ✓ test/unit/cli/structural-blame-render.test.ts (2 tests) 34ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 25ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 26ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 298ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 72ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 28ms
 ✓ test/unit/release/package-library-surface.test.ts (6 tests) 28ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 27ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 137ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 87ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 26ms
 ✓ test/unit/cli/structural-test-coverage-render.test.ts (1 test) 29ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 26ms
 ✓ test/unit/release/v080-witness.test.ts (3 tests) 26ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 26ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 26ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 26ms
 ✓ test/unit/mcp/structural-review-cold-warp.test.ts (1 test) 184ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 54ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (2 tests) 26ms
 ✓ test/unit/warp/sym-id-codec.test.ts (5 tests) 28ms
 ✓ test/unit/cli/structural-review-render.test.ts (1 test) 30ms
 ✓ test/unit/git/version-guard.test.ts (4 tests) 26ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 26ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 153ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 30ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 26ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 33ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 25ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 25ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 27ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 27ms
 ✓ test/unit/echo/determinism.test.ts (1 test) 29ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (4 tests) 25ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 27ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 38ms
 ✓ test/unit/warp/open.test.ts (2 tests) 125ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 25ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 46ms
 ✓ test/unit/release/code-standards.test.ts (1 test) 26ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 25ms
 ✓ test/unit/cli/dead-symbols-render.test.ts (1 test) 29ms
 ✓ test/unit/parser/extractor-common.test.ts (1 test) 25ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 34ms
 ✓ test/unit/version.test.ts (1 test) 28ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 219ms

 Test Files  237 passed (237)
      Tests  1760 passed (1760)
   Start at  19:36:54
   Duration  84.24s (transform 3.69s, setup 6.10s, import 38.71s, tests 102.03s, environment 20ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.59kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.8s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 151.59kB 0.1s done
#5 DONE 0.1s

#6 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#6 CACHED

#7 [deps 2/6] WORKDIR /app
#7 CACHED

#8 [deps 3/6] RUN apk add --no-cache git
#8 CACHED

#9 [deps 4/6] RUN corepack enable &&     for attempt in 1 2 3; do       corepack prepare pnpm@10.30.0 --activate && break;       status=$?;       if [ "$attempt" = "3" ]; then exit "$status"; fi;       sleep "$((attempt * 2))";     done
#9 CACHED

#10 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#10 CACHED

#11 [build 1/3] WORKDIR /app
#11 CACHED

#12 [build 2/3] COPY . .
#12 DONE 0.1s

#13 [build 3/3] RUN pnpm build
#13 0.334 
#13 0.334 > @flyingrobots/graft@0.9.0 build /app
#13 0.334 > tsc -p tsconfig.build.json
#13 0.334 
#13 DONE 6.3s

#14 exporting to image
#14 exporting layers 0.1s done
#14 writing image sha256:4e34c61fe2909a00a44773fe8f600fa8525fa45c1839ecfd6713a4a752f61358
#14 writing image sha256:4e34c61fe2909a00a44773fe8f600fa8525fa45c1839ecfd6713a4a752f61358 done
#14 naming to docker.io/library/graft-test:local done
#14 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/zh03k2mvlnllclkpwsivt72ll

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 312 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift SURFACE_colorful-prose-extractor`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift SURFACE_colorful-prose-extractor
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
