---
title: "Verification Witness for Cycle CORE_graft-doctor"
---

# Verification Witness for Cycle CORE_graft-doctor

This witness proves that `graft doctor repo-generic health posture` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.1 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1109ms
     ✓ retains full read-event history in the WARP graph  1044ms
 ✓ test/unit/cli/init.test.ts (29 tests) 307ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 76ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2139ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 23ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 1689ms
 ✓ test/unit/cli/main.test.ts (20 tests) 3412ms
     ✓ runs doctor sludge scan through the top-level doctor alias  794ms
     ✓ runs peer commands through the grouped CLI surface  762ms
     ✓ runs symbol difficulty through the grouped CLI surface  684ms
     ✓ renders human-friendly diag activity output by default  496ms
     ✓ renders a bounded local-history DAG from WARP-backed history  303ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 4631ms
       ✓ labels historical symbol reads as commit_worldline  1481ms
       ✓ labels dirty working-tree answers as workspace_overlay  318ms
       ✓ doctor reports checkout epochs and semantic checkout transitions  323ms
       ✓ reports hard resets as semantic repo transitions without losing commit_worldline access  335ms
       ✓ reports rebases as semantic repo transitions while preserving ref_view queries  308ms
       ✓ keeps checkout epochs unique across repeated branch flips  388ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 20ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1566ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1011ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  479ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 5223ms
     ✓ returns working-tree source code for a known symbol  448ms
     ✓ returns not found for an unknown symbol  334ms
     ✓ returns an explicit ambiguity response when multiple symbols match  978ms
     ✓ uses WARP for indexed historical reads  678ms
     ✓ falls back to live parsing for historical reads when WARP is not indexed  316ms
     ✓ uses WARP for indexed clean-head symbol search  310ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  307ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 5297ms
     ✓ writes correlated start and completion events for tool calls  758ms
     ✓ writes metadata-only failure events for schema validation errors  355ms
     ✓ exposes runtime observability status in doctor  395ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  524ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  334ms
     ✓ surfaces merge-phase guidance during active conflicted merges  346ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  425ms
     ✓ forks persisted local history when checkout footing changes  398ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  511ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 1373ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  598ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 5654ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  1967ms
     ✓ offloads dirty precision lookups through child-process workers  1342ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  2269ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 135ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 71ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 105ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 1524ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 1458ms
     ✓ refuses .graftignore and policy-denied paths without changing files  392ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1920ms
     ✓ aliased import: import { foo as baz } references foo  341ms
     ✓ default import: import foo from './bar' references default  313ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 8610ms
     ✓ safe_read returns structured JSON with projection  460ms
     ✓ safe_read returns outline for large files  672ms
     ✓ safe_read returns a markdown heading outline for large markdown files  665ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  368ms
     ✓ stats and doctor expose non-read burden breakdowns  308ms
     ✓ budget appears in receipt after set_budget  332ms
     ✓ returns meaning and action for known reason code  300ms
     ✓ tracks session depth across tool calls  638ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 16ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 2471ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  465ms
     ✓ routes heavy daemon repo tools through the scheduler  648ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  546ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 77ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 948ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  389ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 382ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (7 tests) 5859ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1337ms
     ✓ runs an offloaded repo tool on a child-process worker  1143ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1188ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  1021ms
     ✓ runs dirty code_find through the live worker path  1165ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 16ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 1637ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  1566ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 2329ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  300ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  497ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  717ms
     ✓ keeps historical denial parity for git-backed precision and structural reads  362ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 2125ms
     ✓ tracks signature changes across commits in tick order  723ms
     ✓ detects removal with present=false  367ms
     ✓ filters by filePath  326ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 5330ms
     ✓ every safe_read response includes a _receipt  415ms
     ✓ every file_outline response includes a _receipt  471ms
     ✓ every read_range response includes a _receipt  537ms
     ✓ seq increments monotonically  408ms
     ✓ cumulative counters accumulate across calls  366ms
     ✓ receipt on cache hit shows cache_hit projection  402ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 5400ms
     ✓ returns diff projection when file changed between reads  684ms
     ✓ diff includes added symbols  641ms
     ✓ diff includes removed symbols  318ms
     ✓ diff includes changed signatures with old and new values  302ms
     ✓ includes full new outline alongside diff  369ms
     ✓ updates observation cache after returning diff  438ms
     ✓ changed_since returns unchanged when file hasn't changed  330ms
     ✓ changed_since without consume does not update cache (peek)  523ms
     ✓ changed_since with consume: true updates cache  403ms
     ✓ receipt includes diff projection on changed reads  384ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1884ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 6ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 280ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 34ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 1277ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 164ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 13ms
 ✓ test/unit/git/diff.test.ts (17 tests) 1044ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 28ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 18ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 2911ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1498ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  857ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  556ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 1396ms
     ✓ records enough session-local structural edit observations to warn on a later graft_edit  345ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 15ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 11ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 5ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 2083ms
     ✓ returns creation commit for a newly added function  427ms
     ✓ detects last signature change across commits  863ms
     ✓ returns reference count for a symbol  339ms
     ✓ filters by file path when provided  306ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 6ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 15ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 1613ms
       ✓ flags a symbol that changed after the doc was committed  582ms
       ✓ does not flag a symbol that has not changed since the doc  690ms
       ✓ reports unknown symbols not in the WARP graph  332ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 2171ms
       ✓ returns changed symbols when a function signature is modified  498ms
       ✓ returns removed symbols when a function is deleted  524ms
       ✓ returns commits that touched a symbol in order  410ms
       ✓ filters by filePath when provided  457ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 7ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 9ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 5ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 3344ms
     ✓ safe_read returns content for small files  488ms
 ✓ test/unit/warp/since.test.ts (3 tests) 1941ms
     ✓ detects added symbols between two commits  905ms
     ✓ detects removed symbols between two commits  699ms
     ✓ detects signature changes between two commits  335ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 1725ms
     ✓ indexes a multi-file repo and resolves import references  577ms
     ✓ handles aliased imports correctly  644ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 6ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 2255ms
     ✓ detects a stale symbol reference after signature change  922ms
     ✓ passes when docs are fresh (no changes since doc was written)  654ms
     ✓ honors the optional markdown path pattern  357ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 8ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 21ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 7ms
 ✓ test/unit/warp/context.test.ts (8 tests) 10ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 17134ms
     ✓ validates representative MCP tool outputs against the declared schemas  3361ms
     ✓ validates representative CLI peer outputs against the declared schemas  13293ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 1288ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  770ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  511ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 8ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 10ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 30ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 8ms
 ✓ test/integration/safe-read.test.ts (9 tests) 177ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 8ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 6140ms
     ✓ returns content on first read  453ms
     ✓ returns cache_hit on second read of unchanged file  597ms
     ✓ cache_hit includes outline and jump table  430ms
     ✓ cache_hit includes readCount  488ms
     ✓ cache_hit includes estimatedBytesAvoided  348ms
     ✓ returns diff when file changes between reads  326ms
     ✓ different files have independent cache entries  467ms
     ✓ file_outline also uses cache on re-read  447ms
     ✓ file_outline cache invalidates when file changes  507ms
     ✓ stats includes cache metrics  478ms
     ✓ cache_hit includes lastReadAt timestamp  362ms
     ✓ banned files are not cached (still refused on re-read)  357ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  337ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 228ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 1892ms
     ✓ counts symbol changes across commits without git log  736ms
     ✓ counts removed symbols discovered from tick receipts  633ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 44ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 10ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 54ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 2021ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  423ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  429ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  808ms
     ✓ does not truncate when within limits  353ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 3946ms
     ✓ returns empty when no symbols have been removed  424ms
     ✓ detects a symbol removed and not re-added  839ms
     ✓ excludes symbols that were removed then re-added  692ms
     ✓ respects maxCommits to limit search depth  1202ms
     ✓ detects removals across multiple files  786ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 21ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 6466ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  5655ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 2038ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  1194ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  835ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 8ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 8ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 12ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 1966ms
     ✓ counts references from multiple importing files  687ms
     ✓ distinguishes same-named symbols in different files  567ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 9ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 2512ms
     ✓ combines aggregate churn curvature with reference friction  1557ms
     ✓ keeps high-churn symbols low risk when no other file references them  390ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  499ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 9ms
 ✓ test/unit/cli/doctor-posture.test.ts (6 tests) 1877ms
     ✓ Can I run `graft doctor` in a temp repo and read a concise health posture report without seeing raw JSON?  426ms
     ✓ Do top-level `graft doctor` and `graft diag doctor` use the same repo-generic posture rendering by default?  306ms
     ✓ Do tests prove the first slice does not mention drift-sentinel, structural-drift-detection, version-drift, or CI/pre-commit gate semantics?  349ms
 ✓ tests/playback/CORE_graft-doctor.test.ts (6 tests) 2277ms
     ✓ Can I run `graft doctor` in a temp repo and read a concise health posture report without seeing raw JSON?  491ms
     ✓ Can I tell whether sludge scanning was requested without doctor pretending sludge is a mandatory lint gate?  307ms
     ✓ Do top-level `graft doctor` and `graft diag doctor` use the same repo-generic posture rendering by default?  569ms
     ✓ Do tests prove the first slice does not mention drift-sentinel, structural-drift-detection, version-drift, or CI/pre-commit gate semantics?  354ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 84ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 21ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 8ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 407ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 3481ms
     ✓ reports observed files after reads  461ms
     ✓ detects stale files that changed since last read  353ms
     ✓ tracks multiple files  686ms
     ✓ reports correct readCount for re-read files  853ms
     ✓ includes directory coverage summary  426ms
     ✓ staleFiles is empty when nothing changed  416ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 648ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  549ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (6 tests) 1922ms
     ✓ indexes when HEAD differs from lastIndexedCommit  360ms
     ✓ indexes on first run when lastIndexedCommit is null  399ms
     ✓ does not hard-fail monitor ticks when a repo has more parseable files than the indexHead per-call cap  781ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1432ms
     ✓ creates directory nodes from file paths  439ms
     ✓ directory files lens scopes to a subtree  508ms
     ✓ supports structural map query (files + symbols)  483ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 104ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 9ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 45ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 7ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 50ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 723ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  708ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 40ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 272ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 4ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 2565ms
     ✓ finds files that import a named symbol  507ms
     ✓ finds aliased imports  660ms
     ✓ finds multiple referencing files  740ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 29ms
 ✓ test/unit/warp/warp-structural-log.test.ts (5 tests) 1897ms
     ✓ returns structural log entries from WARP graph without git log  486ms
     ✓ respects limit parameter  1120ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 108ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 32ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 8ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 9ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 17ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 12ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 7ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 9ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 10ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 349ms
     ✓ keeps graph state compact and stores the full tree as attached content  348ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 49ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 4461ms
     ✓ renders a human review summary for enhance --since in a temp repo  1053ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  1089ms
     ✓ supports Git external-command invocation through git graft in a temp repo  2313ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 11ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 63ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 7ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 72ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 11ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 6ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 1156ms
     ✓ marks successful captures as outside the bounded-read contract  358ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 89ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 11ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 10ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 5ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 7ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 33ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 7ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 11ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 1836ms
     ✓ returns blame info for a symbol from WARP graph without git calls  446ms
     ✓ tracks signature changes in blame history  823ms
     ✓ includes reference count from WARP graph  398ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 11ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 8ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 7ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 51ms
 ✓ test/unit/operations/state.test.ts (5 tests) 62ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 13ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 539ms
     ✓ returns hydrated nodes from a single BFS + query call  326ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 114ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 1212ms
     ✓ proxies daemon-only workspace binding flow through stdio  414ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 15ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 9ms
 ✓ test/unit/release/package-library-surface.test.ts (6 tests) 13ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 10ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 414ms
 ✓ test/unit/library/index.test.ts (4 tests) 484ms
     ✓ creates a repo-local graft instance with sensible defaults  448ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 9ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 94ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 5ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 6ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 6ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 6ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 10ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 5ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 4ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 3ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 224ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 4ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 7ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 349ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 10ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 5ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 179ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 111ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 8ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 4ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 183ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 8ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 31ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 6ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 5ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 6ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 5ms
 ✓ test/unit/mcp/structural-review-cold-warp.test.ts (1 test) 229ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 4ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 5ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 12ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 47ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 3ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 3ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/warp/open.test.ts (2 tests) 105ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 6ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 6ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 194ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 3253ms
     ✓ monitor nudge triggers an immediate tick that indexes  3066ms

 Test Files  197 passed (197)
      Tests  1481 passed (1481)
   Start at  17:02:41
   Duration  32.25s (transform 10.77s, setup 0ms, import 75.15s, tests 177.73s, environment 14ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.27kB done
#1 DONE 0.0s

#2 [auth] library/node:pull token for registry-1.docker.io
#2 DONE 0.0s

#3 [internal] load metadata for docker.io/library/node:22-alpine
#3 DONE 0.7s

#4 [internal] load .dockerignore
#4 transferring context: 97B done
#4 DONE 0.0s

#5 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f
#5 DONE 0.0s

#6 [internal] load build context
#6 transferring context: 137.47kB 0.1s done
#6 DONE 0.1s

#7 [deps 3/6] RUN apk add --no-cache git
#7 CACHED

#8 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#8 CACHED

#9 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#9 CACHED

#10 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#10 CACHED

#11 [deps 2/6] WORKDIR /app
#11 CACHED

#12 [build 1/3] WORKDIR /app
#12 CACHED

#13 [build 2/3] COPY . .
#13 DONE 0.2s

#14 [build 3/3] RUN pnpm build
#14 0.365 
#14 0.365 > @flyingrobots/graft@0.7.1 build /app
#14 0.365 > tsc -p tsconfig.build.json
#14 0.365 
#14 DONE 6.1s

#15 exporting to image
#15 exporting layers 0.1s done
#15 writing image sha256:99d3218047a65a735d5b5c772801b789df9a291a932115a404c21a93323a4962 done
#15 naming to docker.io/library/graft-test:local done
#15 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/xvn5oed7jif1dhxeotzypys3a

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 269 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_graft-doctor`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_graft-doctor
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
