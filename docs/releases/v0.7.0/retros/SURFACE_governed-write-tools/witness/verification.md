---
title: "Verification Witness for Cycle SURFACE_governed-write-tools"
---

# Verification Witness for Cycle SURFACE_governed-write-tools

This witness proves that `Governed write tools` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1020ms
     ✓ retains full read-event history in the WARP graph  957ms
 ✓ test/unit/cli/init.test.ts (28 tests) 360ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 54ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2291ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 20ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 1698ms
     ✓ categorizes structural vs formatting files  306ms
 ✓ test/unit/cli/main.test.ts (20 tests) 3542ms
     ✓ runs doctor sludge scan through the top-level doctor alias  810ms
     ✓ runs peer commands through the grouped CLI surface  808ms
     ✓ runs symbol difficulty through the grouped CLI surface  769ms
     ✓ renders human-friendly diag activity output by default  489ms
     ✓ renders a bounded local-history DAG from WARP-backed history  310ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 13ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 4564ms
       ✓ labels historical symbol reads as commit_worldline  1536ms
       ✓ labels branch/ref structural comparisons as ref_view  409ms
       ✓ labels dirty working-tree answers as workspace_overlay  338ms
       ✓ keeps checkout epochs unique across repeated branch flips  418ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 5340ms
     ✓ writes correlated start and completion events for tool calls  714ms
     ✓ writes metadata-only failure events for schema validation errors  311ms
     ✓ exposes runtime observability status in doctor  425ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  762ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  321ms
     ✓ surfaces merge-phase guidance during active conflicted merges  332ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  394ms
     ✓ forks persisted local history when checkout footing changes  306ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  468ms
     ✓ keeps internal graft logs out of workspace overlay and clean-head checks  308ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1570ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1002ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  490ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 1423ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  642ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 5537ms
     ✓ returns working-tree source code for a known symbol  580ms
     ✓ returns not found for an unknown symbol  341ms
     ✓ returns an explicit ambiguity response when multiple symbols match  948ms
     ✓ uses WARP for indexed historical reads  781ms
     ✓ falls back to live parsing for historical reads when WARP is not indexed  300ms
     ✓ uses WARP for indexed clean-head symbol search  381ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  369ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 5720ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  2181ms
     ✓ offloads dirty precision lookups through child-process workers  1213ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  2230ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 105ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 60ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 156ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 1359ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 1214ms
     ✓ refuses .graftignore and policy-denied paths without changing files  313ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 8250ms
     ✓ safe_read returns structured JSON with projection  515ms
     ✓ safe_read returns outline for large files  632ms
     ✓ safe_read returns a markdown heading outline for large markdown files  723ms
     ✓ safe_read returns refusal for banned files  316ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  431ms
     ✓ stats and doctor expose non-read burden breakdowns  343ms
     ✓ tracks session depth across tool calls  735ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 16ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1940ms
     ✓ namespace import: import * as ns references the file  320ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 74ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 2555ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  468ms
     ✓ routes heavy daemon repo tools through the scheduler  516ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  741ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 923ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  329ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 379ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 1610ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  1526ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 10ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 4455ms
     ✓ returns diff projection when file changed between reads  603ms
     ✓ diff includes added symbols  543ms
     ✓ diff includes removed symbols  348ms
     ✓ updates observation cache after returning diff  310ms
     ✓ changed_since without consume does not update cache (peek)  304ms
     ✓ changed_since with consume: true updates cache  397ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (5 tests) 6134ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1438ms
     ✓ runs an offloaded repo tool on a child-process worker  1278ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1136ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  1014ms
     ✓ runs dirty code_find through the live worker path  1266ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 2426ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  336ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  424ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  840ms
     ✓ keeps historical denial parity for git-backed precision and structural reads  369ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 2000ms
     ✓ tracks signature changes across commits in tick order  632ms
     ✓ detects removal with present=false  403ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 5130ms
     ✓ every safe_read response includes a _receipt  356ms
     ✓ every file_outline response includes a _receipt  382ms
     ✓ every read_range response includes a _receipt  463ms
     ✓ seq increments monotonically  462ms
     ✓ cumulative counters accumulate across calls  338ms
     ✓ receipt on cache hit shows cache_hit projection  309ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1888ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 7ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 245ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 9ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 115ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 936ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 12ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 34ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 2429ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1271ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  642ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  513ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 1177ms
 ✓ test/unit/git/diff.test.ts (17 tests) 901ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 21ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 7ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 4ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 12ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 6ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 1751ms
     ✓ returns creation commit for a newly added function  338ms
     ✓ detects last signature change across commits  707ms
     ✓ returns reference count for a symbol  342ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 14ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 1482ms
       ✓ flags a symbol that changed after the doc was committed  601ms
       ✓ does not flag a symbol that has not changed since the doc  641ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 8ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 3123ms
     ✓ safe_read returns content for small files  397ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 2311ms
       ✓ returns changed symbols when a function signature is modified  478ms
       ✓ returns removed symbols when a function is deleted  618ms
       ✓ returns commits that touched a symbol in order  461ms
       ✓ filters by filePath when provided  483ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 8ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 9ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 1473ms
     ✓ indexes a multi-file repo and resolves import references  527ms
     ✓ handles aliased imports correctly  448ms
 ✓ test/unit/warp/since.test.ts (3 tests) 1673ms
     ✓ detects added symbols between two commits  774ms
     ✓ detects removed symbols between two commits  597ms
     ✓ detects signature changes between two commits  300ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 7ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 1172ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  799ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  371ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 9ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 2090ms
     ✓ detects a stale symbol reference after signature change  684ms
     ✓ passes when docs are fresh (no changes since doc was written)  650ms
     ✓ honors the optional markdown path pattern  374ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 6ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 8ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 16135ms
     ✓ validates representative MCP tool outputs against the declared schemas  3265ms
     ✓ validates representative CLI peer outputs against the declared schemas  12403ms
 ✓ test/unit/warp/context.test.ts (8 tests) 13ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 10ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 25ms
 ✓ test/integration/safe-read.test.ts (9 tests) 155ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 8ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 16ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 12ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 232ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 56ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 6ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 26ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 1641ms
     ✓ counts symbol changes across commits without git log  451ms
     ✓ counts removed symbols discovered from tick receipts  639ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 20ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 8ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 6180ms
     ✓ returns content on first read  389ms
     ✓ returns cache_hit on second read of unchanged file  451ms
     ✓ cache_hit includes outline and jump table  529ms
     ✓ cache_hit includes readCount  457ms
     ✓ cache_hit includes estimatedBytesAvoided  417ms
     ✓ returns diff when file changes between reads  568ms
     ✓ different files have independent cache entries  477ms
     ✓ file_outline also uses cache on re-read  364ms
     ✓ file_outline cache invalidates when file changes  365ms
     ✓ stats includes cache metrics  524ms
     ✓ cache_hit includes lastReadAt timestamp  427ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  352ms
     ✓ markdown outlines are cached by file_outline once markdown is supported  346ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 11ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 21ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 7ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 1701ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  472ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  475ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  470ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 9ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 1775ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  943ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  829ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 3580ms
     ✓ returns empty when no symbols have been removed  324ms
     ✓ detects a symbol removed and not re-added  867ms
     ✓ excludes symbols that were removed then re-added  667ms
     ✓ respects maxCommits to limit search depth  908ms
     ✓ detects removals across multiple files  811ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 2160ms
     ✓ counts references from multiple importing files  619ms
     ✓ returns count=0 for an exported but never imported symbol  312ms
     ✓ distinguishes same-named symbols in different files  749ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 2546ms
     ✓ combines aggregate churn curvature with reference friction  1332ms
     ✓ keeps high-churn symbols low risk when no other file references them  599ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  577ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 38ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 7ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 14ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 548ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  444ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 131ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 10ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 374ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 2523ms
     ✓ finds files that import a named symbol  461ms
     ✓ finds aliased imports  561ms
     ✓ finds multiple referencing files  710ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 38ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 68ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 5ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 10ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1368ms
     ✓ creates directory nodes from file paths  315ms
     ✓ directory files lens scopes to a subtree  515ms
     ✓ supports structural map query (files + symbols)  536ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 2995ms
     ✓ returns empty map when no files have been read  327ms
     ✓ reports observed files after reads  376ms
     ✓ detects stale files that changed since last read  574ms
     ✓ tracks multiple files  609ms
     ✓ reports correct readCount for re-read files  525ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 289ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 5ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 20ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 128ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 569ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  551ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 38ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 6396ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  5254ms
     ✓ Do ports reject imports from application modules, adapters, primary adapters, and host libraries?  330ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 6ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 4ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 9ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 1059ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (5 tests) 844ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 329ms
     ✓ keeps graph state compact and stores the full tree as attached content  328ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 111ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 16ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 119ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 12ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 10ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 6ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 10ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 49ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 6ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 19ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 10ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 13ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 117ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 6ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 1796ms
     ✓ returns blame info for a symbol from WARP graph without git calls  402ms
     ✓ tracks signature changes in blame history  870ms
     ✓ includes reference count from WARP graph  362ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 5ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 6ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 50ms
 ✓ test/unit/warp/warp-structural-log.test.ts (4 tests) 1591ms
     ✓ returns structural log entries from WARP graph without git log  467ms
     ✓ respects limit parameter  930ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 10ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 5ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 7ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 40ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 11ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 8ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 392ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 5ms
 ✓ test/unit/operations/state.test.ts (5 tests) 35ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 1212ms
     ✓ proxies daemon-only workspace binding flow through stdio  416ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 136ms
 ✓ test/unit/library/index.test.ts (4 tests) 472ms
     ✓ creates a repo-local graft instance with sensible defaults  433ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 8ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 5109ms
     ✓ renders a human review summary for enhance --since in a temp repo  930ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  888ms
     ✓ supports Git external-command invocation through git graft in a temp repo  3288ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 5ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 406ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 6ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 8ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 10ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 5ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 67ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 7ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 4ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 5ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 4ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 4ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 4ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 4ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 191ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 10ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 3ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 327ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 15ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 164ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 4ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 100ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 8ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 5ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 216ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 5ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 6ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 3ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 30ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 7ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 4ms
 ✓ test/unit/release/package-library-surface.test.ts (4 tests) 6ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 4ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 8ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 40ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 3ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 3ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 4ms
 ✓ test/unit/warp/open.test.ts (2 tests) 109ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 9ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 215ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 3088ms
     ✓ monitor nudge triggers an immediate tick that indexes  2917ms

 Test Files  194 passed (194)
      Tests  1461 passed (1461)
   Start at  06:32:29
   Duration  29.89s (transform 9.86s, setup 0ms, import 68.81s, tests 165.61s, environment 15ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.24kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.6s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 134.56kB 0.1s done
#5 DONE 0.1s

#6 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#6 CACHED

#7 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#7 CACHED

#8 [deps 2/6] WORKDIR /app
#8 CACHED

#9 [deps 3/6] RUN apk add --no-cache git
#9 CACHED

#10 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#10 CACHED

#11 [test 1/2] WORKDIR /app
#11 CACHED

#12 [test 2/2] COPY . .
#12 DONE 0.2s

#13 exporting to image
#13 exporting layers 0.1s done
#13 writing image sha256:7b072d8db34b45f9344ce8b2cbe8ce49987c44ae653d6dca65ef2e57b9310f3b done
#13 naming to docker.io/library/graft-test:local done
#13 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/wbbhp1qzvhl7xi7p548iqw5qy

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 9 playback questions, 263 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift SURFACE_governed-write-tools`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift SURFACE_governed-write-tools
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
