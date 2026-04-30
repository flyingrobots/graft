---
title: "Verification Witness for Cycle SURFACE_agent-dx-governed-edit"
---

# Verification Witness for Cycle SURFACE_agent-dx-governed-edit

This witness proves that `Governed edit tool for agent DX` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1342ms
     ✓ retains full read-event history in the WARP graph  1277ms
 ✓ test/unit/cli/init.test.ts (28 tests) 356ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 114ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2780ms
     ✓ detects added exported function as minor semver impact  409ms
     ✓ classifies removed optional exported parameter as major semver impact  338ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 26ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 2070ms
     ✓ categorizes structural vs formatting files  377ms
 ✓ test/unit/cli/main.test.ts (20 tests) 4287ms
     ✓ runs doctor sludge scan through the top-level doctor alias  992ms
     ✓ runs peer commands through the grouped CLI surface  877ms
     ✓ runs symbol difficulty through the grouped CLI surface  925ms
     ✓ renders human-friendly diag activity output by default  687ms
     ✓ renders a bounded local-history DAG from WARP-backed history  403ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 35ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 5718ms
       ✓ labels historical symbol reads as commit_worldline  2060ms
       ✓ labels dirty working-tree answers as workspace_overlay  391ms
       ✓ doctor reports checkout epochs and semantic checkout transitions  315ms
       ✓ reports hard resets as semantic repo transitions without losing commit_worldline access  353ms
       ✓ reports rebases as semantic repo transitions while preserving ref_view queries  345ms
       ✓ keeps checkout epochs unique across repeated branch flips  432ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 6478ms
     ✓ returns working-tree source code for a known symbol  478ms
     ✓ returns not found for an unknown symbol  521ms
     ✓ returns an explicit ambiguity response when multiple symbols match  1085ms
     ✓ uses WARP for indexed historical reads  904ms
     ✓ falls back to live parsing for historical reads when WARP is not indexed  376ms
     ✓ uses WARP for indexed clean-head symbol search  416ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  433ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 1939ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1214ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  611ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 1818ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  797ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 6893ms
     ✓ writes correlated start and completion events for tool calls  1015ms
     ✓ writes metadata-only failure events for schema validation errors  404ms
     ✓ exposes runtime observability status in doctor  621ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  762ms
     ✓ surfaces bulk-transition guidance when many paths move together  335ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  455ms
     ✓ surfaces merge-phase guidance during active conflicted merges  411ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  666ms
     ✓ forks persisted local history when checkout footing changes  433ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  540ms
     ✓ keeps internal graft logs out of workspace overlay and clean-head checks  398ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 7020ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  2573ms
     ✓ offloads dirty precision lookups through child-process workers  1612ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  2727ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 183ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 160ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 97ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 1902ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 1485ms
     ✓ refuses .graftignore and policy-denied paths without changing files  359ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 10360ms
     ✓ safe_read returns structured JSON with projection  802ms
     ✓ safe_read returns outline for large files  809ms
     ✓ safe_read returns a markdown heading outline for large markdown files  752ms
     ✓ safe_read returns refusal for banned files  372ms
     ✓ file_outline returns a markdown heading outline  339ms
     ✓ file_outline refuses files matched by .graftignore  303ms
     ✓ doctor returns sludge signals when requested  308ms
     ✓ activity_view returns recent bounded local artifact history anchored to the current commit  349ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  504ms
     ✓ stats and doctor expose non-read burden breakdowns  319ms
     ✓ budget appears in receipt after set_budget  327ms
     ✓ budget tightens byte cap for large files  342ms
     ✓ no budget in receipt when budget not set  358ms
     ✓ read_range refuses banned files via middleware  323ms
     ✓ tracks session depth across tool calls  717ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 2248ms
     ✓ aliased import: import { foo as baz } references foo  318ms
     ✓ default import: import foo from './bar' references default  382ms
     ✓ namespace import: import * as ns references the file  335ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 18ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 58ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 2873ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  600ms
     ✓ routes heavy daemon repo tools through the scheduler  619ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  689ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 970ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  346ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (5 tests) 6591ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1749ms
     ✓ runs an offloaded repo tool on a child-process worker  1438ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1105ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  1123ms
     ✓ runs dirty code_find through the live worker path  1175ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 14ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 1721ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  1633ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 2572ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  333ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  545ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  721ms
     ✓ keeps historical denial parity for git-backed precision and structural reads  471ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 2207ms
     ✓ returns a single entry for a newly added symbol  351ms
     ✓ tracks signature changes across commits in tick order  687ms
     ✓ detects removal with present=false  330ms
     ✓ filters by filePath  355ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 5693ms
     ✓ every safe_read response includes a _receipt  484ms
     ✓ every file_outline response includes a _receipt  530ms
     ✓ every read_range response includes a _receipt  500ms
     ✓ sessionId is stable across calls  343ms
     ✓ traceId differs per call  309ms
     ✓ seq increments monotonically  427ms
     ✓ cumulative counters accumulate across calls  368ms
     ✓ receipt on cache hit shows cache_hit projection  349ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 2066ms
     ✓ graft_map omits .graftignore-matched files and reports them explicitly  324ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 5521ms
     ✓ returns diff projection when file changed between reads  691ms
     ✓ diff includes added symbols  630ms
     ✓ diff includes removed symbols  417ms
     ✓ diff includes changed signatures with old and new values  337ms
     ✓ updates observation cache after returning diff  394ms
     ✓ changed_since tool returns diff without full read  308ms
     ✓ changed_since returns unchanged when file hasn't changed  352ms
     ✓ changed_since without consume does not update cache (peek)  526ms
     ✓ changed_since checks policy and refuses banned files  302ms
     ✓ changed_since with consume: true updates cache  395ms
     ✓ receipt includes diff projection on changed reads  395ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 6ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 10ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 231ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 110ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 16ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 2796ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1531ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  718ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  546ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 37ms
 ✓ test/unit/git/diff.test.ts (17 tests) 893ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 19ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 1086ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 7ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 4ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 15ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 6ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 14ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 2323ms
     ✓ returns creation commit for a newly added function  362ms
     ✓ detects last signature change across commits  840ms
     ✓ returns reference count for a symbol  516ms
     ✓ filters by file path when provided  463ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 1690ms
       ✓ flags a symbol that changed after the doc was committed  739ms
       ✓ does not flag a symbol that has not changed since the doc  724ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 7ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 19ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 2740ms
       ✓ returns added symbols for a commit that adds functions  500ms
       ✓ returns changed symbols when a function signature is modified  629ms
       ✓ returns removed symbols when a function is deleted  582ms
       ✓ returns commits that touched a symbol in order  561ms
       ✓ filters by filePath when provided  465ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 13ms
 ✓ test/unit/warp/since.test.ts (3 tests) 2030ms
     ✓ detects added symbols between two commits  898ms
     ✓ detects removed symbols between two commits  720ms
     ✓ detects signature changes between two commits  411ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 1764ms
     ✓ indexes a multi-file repo and resolves import references  630ms
     ✓ handles aliased imports correctly  490ms
     ✓ emits file nodes for all parsed files  323ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 3623ms
     ✓ safe_read returns content for small files  463ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 15ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 2431ms
     ✓ detects a stale symbol reference after signature change  884ms
     ✓ passes when docs are fresh (no changes since doc was written)  635ms
     ✓ honors the optional markdown path pattern  443ms
     ✓ produces machine-readable output with file, symbol, and nature  323ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 18ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 1528ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  988ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  538ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 12ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 11ms
 ✓ test/unit/warp/context.test.ts (8 tests) 11ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 15ms
 ✓ test/integration/safe-read.test.ts (9 tests) 206ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 15ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 40ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 8ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 43ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 323ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 19825ms
     ✓ validates representative MCP tool outputs against the declared schemas  3995ms
     ✓ validates representative CLI peer outputs against the declared schemas  15215ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 2354ms
     ✓ counts symbol changes across commits without git log  649ms
     ✓ counts removed symbols discovered from tick receipts  887ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 49ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 9ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 7130ms
     ✓ returns content on first read  454ms
     ✓ returns cache_hit on second read of unchanged file  712ms
     ✓ cache_hit includes outline and jump table  506ms
     ✓ cache_hit includes readCount  679ms
     ✓ cache_hit includes estimatedBytesAvoided  552ms
     ✓ returns diff when file changes between reads  432ms
     ✓ different files have independent cache entries  438ms
     ✓ file_outline also uses cache on re-read  410ms
     ✓ file_outline cache invalidates when file changes  397ms
     ✓ stats includes cache metrics  630ms
     ✓ cache_hit includes lastReadAt timestamp  336ms
     ✓ banned files are not cached (still refused on re-read)  331ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  444ms
     ✓ markdown outlines are cached by file_outline once markdown is supported  430ms
     ✓ changed_since reports structural diffs for markdown headings  376ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 39ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 30ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 11ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 15ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 87ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 2659ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  687ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  733ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  814ms
     ✓ does not truncate when within limits  421ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 14ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 18ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 5216ms
     ✓ returns empty when no symbols have been removed  519ms
     ✓ detects a symbol removed and not re-added  1015ms
     ✓ excludes symbols that were removed then re-added  886ms
     ✓ respects maxCommits to limit search depth  1310ms
     ✓ detects removals across multiple files  1483ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 3084ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  1514ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  1564ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 3165ms
     ✓ counts references from multiple importing files  1072ms
     ✓ returns count=0 for an exported but never imported symbol  556ms
     ✓ distinguishes same-named symbols in different files  836ms
     ✓ counts re-exports as references  401ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 91ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 3837ms
     ✓ combines aggregate churn curvature with reference friction  2090ms
     ✓ keeps high-churn symbols low risk when no other file references them  818ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  859ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 1055ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  844ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 27ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 13ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 196ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 8ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 494ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1727ms
     ✓ creates directory nodes from file paths  450ms
     ✓ directory files lens scopes to a subtree  502ms
     ✓ supports structural map query (files + symbols)  773ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 35ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 3751ms
     ✓ finds files that import a named symbol  881ms
     ✓ finds aliased imports  748ms
     ✓ finds multiple referencing files  1030ms
     ✓ returns empty for unreferenced symbol  370ms
     ✓ finds namespace imports that reference the file  421ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 7ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 64ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 4413ms
     ✓ returns empty map when no files have been read  509ms
     ✓ reports observed files after reads  728ms
     ✓ detects stale files that changed since last read  673ms
     ✓ tracks multiple files  891ms
     ✓ reports correct readCount for re-read files  759ms
     ✓ includes directory coverage summary  494ms
     ✓ staleFiles is empty when nothing changed  346ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 23ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 5ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 363ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 25ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 124ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 9011ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  7677ms
     ✓ Do ports reject imports from application modules, adapters, primary adapters, and host libraries?  419ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 32ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 713ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  697ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 16ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 18ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 8ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 445ms
     ✓ keeps graph state compact and stores the full tree as attached content  444ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 103ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 2254ms
     ✓ marks successful captures as outside the bounded-read contract  331ms
     ✓ can be disabled explicitly by configuration  375ms
     ✓ redacts obvious secrets before persisting logs  814ms
     ✓ supports opt-out log persistence  459ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 28ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 94ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 5ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (5 tests) 2230ms
     ✓ indexes when HEAD differs from lastIndexedCommit  849ms
     ✓ indexes on first run when lastIndexedCommit is null  548ms
     ✓ consecutive ticks with same HEAD: second tick skips  549ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 13ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 6ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 11ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 49ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 21ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 5ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 7ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 22ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 143ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 3066ms
     ✓ returns blame info for a symbol from WARP graph without git calls  541ms
     ✓ tracks signature changes in blame history  1705ms
     ✓ includes reference count from WARP graph  520ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 7ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 6ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 4ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 219ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 11ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 129ms
 ✓ test/unit/warp/warp-structural-log.test.ts (4 tests) 3383ms
     ✓ returns structural log entries from WARP graph without git log  758ms
     ✓ respects limit parameter  2096ms
     ✓ includes commit SHA in each entry  396ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 114ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 1103ms
     ✓ returns hydrated nodes from a single BFS + query call  615ms
     ✓ returns empty array when no nodes are reachable  487ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 36ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 26ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 16ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 9ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 8373ms
     ✓ renders a human review summary for enhance --since in a temp repo  1353ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  1051ms
     ✓ supports Git external-command invocation through git graft in a temp repo  5963ms
 ✓ test/unit/operations/state.test.ts (5 tests) 49ms
 ✓ test/unit/library/index.test.ts (4 tests) 861ms
     ✓ creates a repo-local graft instance with sensible defaults  832ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 2742ms
     ✓ proxies daemon-only workspace binding flow through stdio  885ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 9ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 223ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 7ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 14ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 12ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 28ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 832ms
     ✓ scrubs inherited live-repo Git environment for createServerInRepo  341ms
     ✓ does not eagerly open WARP local-history graph for createServerInRepo  488ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 169ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 10ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 5ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 7ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 17ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 6ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 4ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 7ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 9ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 11ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 257ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 9ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 14ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 259ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 6ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 263ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 149ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 562ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 4ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 5ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 9ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 6ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 4ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 32ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 5ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 7ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 5ms
 ✓ test/unit/release/package-library-surface.test.ts (4 tests) 4ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 9ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 54ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 4ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 3ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/warp/open.test.ts (2 tests) 135ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 5ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 4ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 4320ms
     ✓ monitor nudge triggers an immediate tick that indexes  4088ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 239ms

 Test Files  192 passed (192)
      Tests  1444 passed (1444)
   Start at  16:18:01
   Duration  38.97s (transform 13.09s, setup 0ms, import 92.89s, tests 214.85s, environment 22ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.24kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.7s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 137.08kB 0.1s done
#5 DONE 0.1s

#6 [deps 2/6] WORKDIR /app
#6 CACHED

#7 [deps 3/6] RUN apk add --no-cache git
#7 CACHED

#8 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#8 CACHED

#9 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#9 CACHED

#10 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#10 CACHED

#11 [test 1/2] WORKDIR /app
#11 CACHED

#12 [test 2/2] COPY . .
#12 DONE 0.2s

#13 exporting to image
#13 exporting layers 0.1s done
#13 writing image sha256:da9122f9ab50076957a235234f6d3b64ee540f735ffd6edff6473544a928c1bf done
#13 naming to docker.io/library/graft-test:local done
#13 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/9m6h990zqkhn6gyfyvqmoyfb6

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 11 playback questions, 254 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift SURFACE_agent-dx-governed-edit`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift SURFACE_agent-dx-governed-edit
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
