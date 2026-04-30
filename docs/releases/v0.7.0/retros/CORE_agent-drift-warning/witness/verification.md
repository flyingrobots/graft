---
title: "Verification Witness for Cycle CORE_agent-drift-warning"
---

# Verification Witness for Cycle CORE_agent-drift-warning

This witness proves that `Agent drift warning` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1170ms
     ✓ retains full read-event history in the WARP graph  1072ms
 ✓ test/unit/cli/init.test.ts (28 tests) 481ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 73ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2206ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 13ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 1699ms
 ✓ test/unit/cli/main.test.ts (20 tests) 3302ms
     ✓ runs doctor sludge scan through the top-level doctor alias  715ms
     ✓ runs peer commands through the grouped CLI surface  818ms
     ✓ runs symbol difficulty through the grouped CLI surface  726ms
     ✓ renders human-friendly diag activity output by default  438ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 18ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 4519ms
       ✓ labels historical symbol reads as commit_worldline  1589ms
       ✓ labels branch/ref structural comparisons as ref_view  398ms
       ✓ labels dirty working-tree answers as workspace_overlay  327ms
       ✓ keeps checkout epochs unique across repeated branch flips  451ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 5393ms
     ✓ writes correlated start and completion events for tool calls  810ms
     ✓ writes metadata-only failure events for schema validation errors  405ms
     ✓ exposes runtime observability status in doctor  506ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  473ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  384ms
     ✓ surfaces merge-phase guidance during active conflicted merges  304ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  405ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  544ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 5498ms
     ✓ returns working-tree source code for a known symbol  686ms
     ✓ returns not found for an unknown symbol  363ms
     ✓ returns an explicit ambiguity response when multiple symbols match  979ms
     ✓ uses WARP for indexed historical reads  692ms
     ✓ uses WARP for indexed clean-head symbol search  330ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  325ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 110ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 1465ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  628ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1803ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1136ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  576ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 115ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 6007ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  2195ms
     ✓ offloads dirty precision lookups through child-process workers  1314ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  2405ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 88ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 1571ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 1176ms
     ✓ refuses .graftignore and policy-denied paths without changing files  302ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 8093ms
     ✓ safe_read returns structured JSON with projection  560ms
     ✓ safe_read returns outline for large files  551ms
     ✓ safe_read returns a markdown heading outline for large markdown files  739ms
     ✓ activity_view returns recent bounded local artifact history anchored to the current commit  305ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  325ms
     ✓ tracks session depth across tool calls  662ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 21ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1926ms
     ✓ re-export: export { foo } from './bar' references sym  313ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 86ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 2023ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  352ms
     ✓ routes heavy daemon repo tools through the scheduler  370ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  701ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 930ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  308ms
     ✓ surfaces hook-observed checkout boundaries after an installed transition hook fires  315ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1878ms
     ✓ tracks signature changes across commits in tick order  478ms
     ✓ detects removal with present=false  521ms
     ✓ filters by filePath  327ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 1565ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  1489ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 2104ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  303ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  510ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  625ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (5 tests) 5839ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1393ms
     ✓ runs an offloaded repo tool on a child-process worker  1219ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1138ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  996ms
     ✓ runs dirty code_find through the live worker path  1092ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 13ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1679ms
     ✓ graft_map summary mode reports symbol counts without emitting per-symbol payloads  350ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 4438ms
     ✓ returns diff projection when file changed between reads  603ms
     ✓ diff includes added symbols  466ms
     ✓ diff includes removed symbols  390ms
     ✓ updates observation cache after returning diff  301ms
     ✓ changed_since without consume does not update cache (peek)  401ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 4986ms
     ✓ every safe_read response includes a _receipt  396ms
     ✓ every file_outline response includes a _receipt  344ms
     ✓ every read_range response includes a _receipt  382ms
     ✓ every stats response includes a _receipt  339ms
     ✓ seq increments monotonically  384ms
     ✓ cumulative counters accumulate across calls  349ms
     ✓ tracks non-read burden by tool kind in receipts  307ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 11ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 352ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 8ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 173ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 1339ms
 ✓ test/unit/git/diff.test.ts (17 tests) 1103ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 23ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 2873ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1465ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  818ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  588ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 28ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 1360ms
     ✓ records enough session-local structural edit observations to warn on a later graft_edit  301ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 25ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 15ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 5ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 6ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 10ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 2293ms
     ✓ returns creation commit for a newly added function  488ms
     ✓ detects last signature change across commits  937ms
     ✓ returns reference count for a symbol  433ms
     ✓ filters by file path when provided  317ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 20ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 1759ms
       ✓ flags a symbol that changed after the doc was committed  678ms
       ✓ does not flag a symbol that has not changed since the doc  719ms
       ✓ reports unknown symbols not in the WARP graph  349ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 8ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 3604ms
     ✓ safe_read returns content for small files  351ms
     ✓ doctor returns health check  328ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 8ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 6ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 2619ms
       ✓ returns added symbols for a commit that adds functions  335ms
       ✓ returns changed symbols when a function signature is modified  561ms
       ✓ returns removed symbols when a function is deleted  726ms
       ✓ returns commits that touched a symbol in order  576ms
       ✓ filters by filePath when provided  418ms
 ✓ test/unit/warp/since.test.ts (3 tests) 2057ms
     ✓ detects added symbols between two commits  706ms
     ✓ detects removed symbols between two commits  973ms
     ✓ detects signature changes between two commits  377ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 1839ms
     ✓ indexes a multi-file repo and resolves import references  722ms
     ✓ handles aliased imports correctly  602ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 7ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 1441ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  1002ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  437ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 10ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 2482ms
     ✓ detects a stale symbol reference after signature change  925ms
     ✓ passes when docs are fresh (no changes since doc was written)  709ms
     ✓ honors the optional markdown path pattern  409ms
     ✓ produces machine-readable output with file, symbol, and nature  302ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 14ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 21ms
 ✓ test/unit/warp/context.test.ts (8 tests) 14ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 16ms
 ✓ test/integration/safe-read.test.ts (9 tests) 122ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 8ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 17ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 17ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 6015ms
     ✓ returns content on first read  397ms
     ✓ returns cache_hit on second read of unchanged file  420ms
     ✓ cache_hit includes outline and jump table  603ms
     ✓ cache_hit includes readCount  480ms
     ✓ cache_hit includes estimatedBytesAvoided  334ms
     ✓ returns diff when file changes between reads  395ms
     ✓ different files have independent cache entries  489ms
     ✓ file_outline also uses cache on re-read  431ms
     ✓ file_outline cache invalidates when file changes  489ms
     ✓ stats includes cache metrics  432ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  451ms
     ✓ markdown outlines are cached by file_outline once markdown is supported  306ms
     ✓ changed_since reports structural diffs for markdown headings  301ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 8ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 196ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 1743ms
     ✓ counts symbol changes across commits without git log  621ms
     ✓ counts removed symbols discovered from tick receipts  637ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 66ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 17757ms
     ✓ validates representative MCP tool outputs against the declared schemas  3387ms
     ✓ validates representative CLI peer outputs against the declared schemas  13901ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 7ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 56ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 17ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 18ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 12ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 15ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 10ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 20ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 1843ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  563ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  399ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  571ms
     ✓ does not truncate when within limits  307ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 3857ms
     ✓ returns empty when no symbols have been removed  383ms
     ✓ detects a symbol removed and not re-added  834ms
     ✓ excludes symbols that were removed then re-added  703ms
     ✓ respects maxCommits to limit search depth  960ms
     ✓ detects removals across multiple files  974ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 2161ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  942ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  1215ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 2304ms
     ✓ counts references from multiple importing files  745ms
     ✓ distinguishes same-named symbols in different files  874ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 2580ms
     ✓ combines aggregate churn curvature with reference friction  1472ms
     ✓ keeps high-churn symbols low risk when no other file references them  487ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  558ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 94ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 18ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 701ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  609ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 6ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 109ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 10ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 375ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 26ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 2809ms
     ✓ finds files that import a named symbol  598ms
     ✓ finds aliased imports  591ms
     ✓ finds multiple referencing files  800ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 62ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 5ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1358ms
     ✓ creates directory nodes from file paths  407ms
     ✓ directory files lens scopes to a subtree  354ms
     ✓ supports structural map query (files + symbols)  596ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 3017ms
     ✓ returns empty map when no files have been read  347ms
     ✓ reports observed files after reads  524ms
     ✓ detects stale files that changed since last read  421ms
     ✓ tracks multiple files  728ms
     ✓ reports correct readCount for re-read files  464ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 9ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 8ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 284ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 30ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 117ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 30ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 599ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  583ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 6767ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  5682ms
     ✓ Do ports reject imports from application modules, adapters, primary adapters, and host libraries?  320ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 7ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 5ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 7ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 1115ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 91ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 14ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 94ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (5 tests) 960ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 368ms
     ✓ keeps graph state compact and stores the full tree as attached content  364ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 5ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 12ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 7ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 7ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 51ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 7ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 5ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 25ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 102ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 6ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 10ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 1745ms
     ✓ returns blame info for a symbol from WARP graph without git calls  443ms
     ✓ tracks signature changes in blame history  738ms
     ✓ includes reference count from WARP graph  406ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 4ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 5ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 53ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 13ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 68ms
 ✓ test/unit/warp/warp-structural-log.test.ts (4 tests) 1972ms
     ✓ returns structural log entries from WARP graph without git log  454ms
     ✓ respects limit parameter  1293ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 20ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 28ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 16ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 635ms
     ✓ returns hydrated nodes from a single BFS + query call  379ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 10ms
 ✓ test/unit/operations/state.test.ts (5 tests) 46ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 11ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 164ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 5493ms
     ✓ renders a human review summary for enhance --since in a temp repo  1015ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  801ms
     ✓ supports Git external-command invocation through git graft in a temp repo  3673ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/unit/library/index.test.ts (4 tests) 622ms
     ✓ creates a repo-local graft instance with sensible defaults  577ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 7ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 15ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 1916ms
     ✓ proxies daemon-only workspace binding flow through stdio  648ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 484ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 7ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 12ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 16ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 106ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 5ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 10ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 4ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 6ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 4ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 9ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 5ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 5ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 7ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 4ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 287ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 17ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 477ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 4ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 5ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 112ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 215ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 6ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 202ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 5ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 7ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 7ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 4ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 26ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 4ms
 ✓ test/unit/release/package-library-surface.test.ts (4 tests) 4ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 4ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 5ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 14ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 44ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 4ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/warp/open.test.ts (2 tests) 122ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 4ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 5ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 181ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 3465ms
     ✓ monitor nudge triggers an immediate tick that indexes  3295ms

 Test Files  193 passed (193)
      Tests  1452 passed (1452)
   Start at  16:37:28
   Duration  31.65s (transform 10.63s, setup 0ms, import 73.57s, tests 174.78s, environment 17ms)

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
#5 transferring context: 135.62kB 0.1s done
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

#11 [test 1/2] WORKDIR /app
#11 CACHED

#12 [test 2/2] COPY . .
#12 DONE 0.2s

#13 exporting to image
#13 exporting layers 0.1s done
#13 writing image sha256:c602b39dd3f28c83ee75ca22149601e57bf78276d408d635d3e6985985a39994 done
#13 naming to docker.io/library/graft-test:local done
#13 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/edxkjv1ly4u5qpy15dh6ejdme

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 254 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Playback Coverage

The playback checklist is covered by
`test/unit/mcp/graft-edit-drift-warning.test.ts`:

- `records enough session-local structural edit observations to warn on a
  later graft_edit` verifies same-session structural observations.
- `emits an advisory drift diagnostic without refusing the reintroducing edit`
  verifies `driftWarnings` is advisory only and the edit still succeeds.
- `allows the graft_edit output schema to validate advisory drift warnings`
  verifies schema coverage.
- `emits no warning when the edit structure cannot be classified` verifies the
  classifier is narrow and does not guess.
- `does not emit drift warnings across separate MCP sessions` verifies
  session-local behavior.
- `does not claim causal write provenance for the advisory drift warning`
  verifies there is no provenance, causal write event, write event, or
  persisted write-history claim.
- `does not introduce native Edit/Write interception` verifies no native tool
  interception.
- `keeps drift warnings out of daemon, WARP, LSP, and provenance expansion`
  verifies the slice did not expand into those subsystems.

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_agent-drift-warning`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_agent-drift-warning
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
