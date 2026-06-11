---
title: "Verification Witness for Cycle CORE_structural-reading-port-generated-model-parity"
---

# Verification Witness for Cycle CORE_structural-reading-port-generated-model-parity

This witness proves that `StructuralReadingPort Generated-Model Parity` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.9.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/parser/outline.test.ts (26 tests) 108ms
 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 795ms
     ✓ retains full read-event history in the WARP graph  731ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 3005ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  360ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 4487ms
     ✓ tracks session depth across tool calls  362ms
 ✓ test/unit/cli/init.test.ts (29 tests) 234ms
 ✓ test/unit/echo/generated-model-parity.test.ts (25 tests) 63ms
 ✓ test/unit/cli/main.test.ts (20 tests) 1735ms
     ✓ runs symbol difficulty through the grouped CLI surface  520ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 2873ms
     ✓ returns an explicit ambiguity response when multiple symbols match  387ms
     ✓ uses WARP for indexed historical reads  375ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 2954ms
       ✓ labels historical symbol reads as commit_worldline  636ms
       ✓ reports hard resets as semantic repo transitions without losing commit_worldline access  401ms
       ✓ keeps checkout epochs unique across repeated branch flips  304ms
 ✓ test/unit/warp/lsp-semantic-enrichment.test.ts (13 tests) 1948ms
     ✓ golden path: emits same-file fake-provider call edges and typeof properties for explicit paths  312ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 3791ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  903ms
     ✓ offloads dirty precision lookups through child-process workers  775ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  1971ms
 ✓ test/unit/contracts/graft-structural-history-schema.test.ts (13 tests) 334ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 1176ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 68ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 1112ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 14ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 13154ms
     ✓ validates representative MCP tool outputs against the declared schemas  3223ms
     ✓ validates representative CLI peer outputs against the declared schemas  9407ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1330ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  868ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  336ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 861ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  336ms
 ✓ test/unit/mcp/workspace-binding.test.ts (12 tests) 1484ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  307ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  354ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 40ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (7 tests) 3978ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  945ms
     ✓ runs an offloaded repo tool on a child-process worker  737ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  665ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  735ms
     ✓ runs dirty code_find through the live worker path  858ms
 ✓ test/unit/operations/structural-test-coverage-map.test.ts (5 tests) 264ms
 ✓ tests/playback/SURFACE_opened-workspace-paths.test.ts (7 tests) 2022ms
     ✓ Can a repo-local MCP server open a second git worktree and run `safe_read`, `graft_map`, and `code_find` against it without process restart?  555ms
     ✓ Does activation reset session-local cache, budget, saved state, metrics, and repo-state tracking instead of bleeding state across worktrees?  439ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 75ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 107ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 67ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 554ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 818ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 2832ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1085ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 2281ms
     ✓ diff includes removed symbols  334ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 527ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 35ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 897ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  825ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 1234ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  404ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 234ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1104ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1013ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 37ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 1365ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  674ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  435ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 475ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 152ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 513ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 1004ms
     ✓ detects last signature change across commits  349ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 2471ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 31ms
 ✓ test/unit/git/diff.test.ts (17 tests) 456ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 30ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 74ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 1547ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 35ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 44ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 1043ms
       ✓ returns removed symbols when a function is deleted  311ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 41ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 38ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 31ms
 ✓ tests/playback/CORE_v080-scope-formation.test.ts (6 tests) 32ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (4 tests) 41ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 760ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 30ms
 ✓ test/unit/warp/structural-reading-adapter.test.ts (4 tests) 30ms
 ✓ tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts (9 tests) 30ms
 ✓ test/unit/mcp/opened-workspaces.test.ts (5 tests) 744ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 30ms
 ✓ test/unit/mcp/map-truncation.test.ts (5 tests) 963ms
 ✓ test/unit/warp/since.test.ts (3 tests) 856ms
     ✓ detects removed symbols between two commits  343ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 1002ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 39ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 839ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 620ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  381ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 30ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 31ms
 ✓ test/unit/ports/structural-reading.test.ts (4 tests) 29ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 28ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 854ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 3021ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  2598ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 39ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 32ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 1597ms
     ✓ detects a symbol removed and not re-added  348ms
     ✓ excludes symbols that were removed then re-added  406ms
     ✓ respects maxCommits to limit search depth  348ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 36ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 34ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 1344ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  833ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  483ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 30ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 31ms
 ✓ test/unit/warp/context.test.ts (8 tests) 35ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 31ms
 ✓ test/unit/cli/doctor-posture.test.ts (7 tests) 761ms
 ✓ test/unit/scripts/docker-autostart.test.ts (6 tests) 33ms
 ✓ test/integration/safe-read.test.ts (9 tests) 82ms
 ✓ test/unit/parser/lang.test.ts (15 tests) 33ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 41ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 30ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 106ms
 ✓ test/unit/release/docker-test-isolation.test.ts (6 tests) 31ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 31ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 48ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 54ms
 ✓ test/unit/warp/warp-structural-log.test.ts (6 tests) 997ms
     ✓ respects limit parameter  538ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 31ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 1092ms
     ✓ combines aggregate churn curvature with reference friction  605ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 957ms
     ✓ distinguishes same-named symbols in different files  349ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 1324ms
     ✓ tracks multiple files  316ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (7 tests) 34ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 40ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 31ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 33ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 34ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 1130ms
     ✓ finds multiple referencing files  421ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 2756ms
     ✓ renders a human review summary for enhance --since in a temp repo  851ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  476ms
     ✓ supports Git external-command invocation through git graft in a temp repo  1404ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 29ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 39ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (6 tests) 698ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 335ms
 ✓ test/unit/echo/obstruction-mapping.test.ts (10 tests) 36ms
 ✓ tests/playback/CORE_pr-review-structural-summary.test.ts (2 tests) 532ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 560ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 30ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 51ms
 ✓ test/unit/echo/wire-strictness.test.ts (4 tests) 31ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (4 tests) 31ms
 ✓ tests/playback/CORE_graft-doctor.test.ts (6 tests) 762ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 356ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  320ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 158ms
 ✓ test/unit/library/index.test.ts (5 tests) 1059ms
     ✓ keeps sync projection bundles non-throwing before parser warmup  807ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 75ms
 ✓ tests/playback/CORE_structural-test-coverage-map.test.ts (2 tests) 357ms
 ✓ tests/playback/SURFACE_capability-matrix-truth.test.ts (6 tests) 33ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 31ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 456ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 42ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 50ms
 ✓ test/unit/cli/command-parser.test.ts (8 tests) 30ms
 ✓ test/unit/echo/authority-boundary.test.ts (5 tests) 32ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 169ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 29ms
 ✓ test/unit/operations/review-cooldown-status.test.ts (6 tests) 29ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 31ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 77ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 58ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 821ms
     ✓ tracks signature changes in blame history  328ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 59ms
 ✓ test/unit/contracts/graft-structural-history-echo-package.test.ts (3 tests) 32ms
 ✓ test/unit/echo/query-through-app.test.ts (3 tests) 43ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 38ms
 ✓ test/unit/mcp/structural-blame.test.ts (2 tests) 855ms
     ✓ returns per-version path and line ranges for symbol history entries  483ms
     ✓ keeps paths on removed history entries without requiring line ranges  345ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 153ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 28ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 30ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 32ms
 ✓ tests/playback/WARP_symbol-history-timeline.test.ts (1 test) 848ms
     ✓ Can I read a human symbol timeline from indexed WARP history?  822ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 676ms
 ✓ tests/playback/SURFACE_review-cooldown-status.test.ts (2 tests) 64ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 33ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 30ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 30ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 29ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 47ms
 ✓ test/unit/echo/intent-flow.test.ts (7 tests) 33ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 31ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 62ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 29ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (3 tests) 28ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 29ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 32ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 47ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 30ms
 ✓ test/unit/mcp/context-guard.test.ts (8 tests) 31ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 51ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 26ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 29ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 210ms
 ✓ test/unit/release/package-docs.test.ts (3 tests) 78ms
 ✓ test/unit/cli/index-cmd.test.ts (3 tests) 140ms
 ✓ test/unit/echo/structural-history-codec.test.ts (5 tests) 28ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 2679ms
     ✓ monitor nudge triggers an immediate tick that indexes  2463ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 241ms
 ✓ tests/playback/WARP_dead-symbol-detection.test.ts (1 test) 955ms
     ✓ Can I list symbols removed from indexed history and not re-added?  930ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 31ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 29ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 30ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 29ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 28ms
 ✓ test/unit/operations/state.test.ts (5 tests) 31ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 28ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 93ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 156ms
 ✓ test/unit/cli/structural-blame-render.test.ts (2 tests) 32ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 26ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 28ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 259ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 29ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 81ms
 ✓ test/unit/release/package-library-surface.test.ts (6 tests) 29ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 30ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 137ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 99ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 28ms
 ✓ test/unit/cli/structural-test-coverage-render.test.ts (1 test) 31ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 28ms
 ✓ test/unit/release/v080-witness.test.ts (3 tests) 27ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 29ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 30ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 27ms
 ✓ test/unit/mcp/structural-review-cold-warp.test.ts (1 test) 182ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 52ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (2 tests) 28ms
 ✓ test/unit/warp/sym-id-codec.test.ts (5 tests) 31ms
 ✓ test/unit/cli/structural-review-render.test.ts (1 test) 34ms
 ✓ test/unit/git/version-guard.test.ts (4 tests) 27ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 29ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 34ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 158ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 28ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 35ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 28ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 27ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 29ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 29ms
 ✓ test/unit/echo/determinism.test.ts (1 test) 29ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (4 tests) 27ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 29ms
 ✓ test/unit/warp/open.test.ts (2 tests) 141ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 39ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 28ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 51ms
 ✓ test/unit/release/code-standards.test.ts (1 test) 27ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 27ms
 ✓ test/unit/cli/dead-symbols-render.test.ts (1 test) 32ms
 ✓ test/unit/parser/extractor-common.test.ts (1 test) 26ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 36ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 242ms
 ✓ test/unit/version.test.ts (1 test) 30ms

 Test Files  233 passed (233)
      Tests  1702 passed (1702)
   Start at  16:20:41
   Duration  89.93s (transform 3.58s, setup 6.15s, import 40.74s, tests 110.77s, environment 20ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.27kB done
#1 DONE 0.0s

#2 [auth] library/node:pull token for registry-1.docker.io
#2 DONE 0.0s

#3 [internal] load metadata for docker.io/library/node:22-alpine
#3 DONE 0.8s

#4 [internal] load .dockerignore
#4 transferring context: 97B done
#4 DONE 0.0s

#5 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:9385cd9f3001dfc3431e8ead12c43e9e1f87cc1b9b5c6cfd0f73865d405b27c4
#5 DONE 0.0s

#6 [internal] load build context
#6 transferring context: 203.75kB 0.1s done
#6 DONE 0.1s

#7 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#7 CACHED

#8 [deps 2/6] WORKDIR /app
#8 CACHED

#9 [deps 3/6] RUN apk add --no-cache git
#9 CACHED

#10 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#10 CACHED

#11 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#11 CACHED

#12 [build 1/3] WORKDIR /app
#12 CACHED

#13 [build 2/3] COPY . .
#13 DONE 0.3s

#14 [build 3/3] RUN pnpm build
#14 0.484 
#14 0.484 > @flyingrobots/graft@0.9.0 build /app
#14 0.484 > tsc -p tsconfig.build.json
#14 0.484 
#14 DONE 6.7s

#15 exporting to image
#15 exporting layers 0.1s done
#15 writing image sha256:f49f4bcb76f9e2c28be531ad1ced2943964df370af462f10c2af7f7cbe9a55f8 done
#15 naming to docker.io/library/graft-test:local done
#15 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/6r8fpdmgttdve7366mq4py3jm

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 306 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_structural-reading-port-generated-model-parity`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_structural-reading-port-generated-model-parity
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
