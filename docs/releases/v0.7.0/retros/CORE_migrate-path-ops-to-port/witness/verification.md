---
title: "Verification Witness for Cycle CORE_migrate-path-ops-to-port"
---

# Verification Witness for Cycle CORE_migrate-path-ops-to-port

This witness proves that `PathOps runtime boundary hardening first slice` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1205ms
     ✓ retains full read-event history in the WARP graph  1114ms
 ✓ test/unit/cli/init.test.ts (28 tests) 324ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 42ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2275ms
     ✓ ignores non-exported symbols  310ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 56ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 2202ms
     ✓ categorizes test, docs, and config files  367ms
     ✓ does NOT flag removal of non-exported symbol as breaking  314ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 17ms
 ✓ test/unit/cli/main.test.ts (20 tests) 4151ms
     ✓ runs doctor sludge scan through the top-level doctor alias  763ms
     ✓ runs peer commands through the grouped CLI surface  873ms
     ✓ runs symbol difficulty through the grouped CLI surface  1021ms
     ✓ runs diag activity through the grouped CLI surface  324ms
     ✓ renders human-friendly diag activity output by default  630ms
     ✓ renders a bounded local-history DAG from WARP-backed history  376ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 5738ms
       ✓ labels historical symbol reads as commit_worldline  1277ms
       ✓ labels branch/ref structural comparisons as ref_view  625ms
       ✓ labels dirty working-tree answers as workspace_overlay  641ms
       ✓ labels default structural diffs against the working tree as workspace_overlay  351ms
       ✓ doctor reports checkout epochs and semantic checkout transitions  427ms
       ✓ tracks detached-head checkouts as checkout epochs with commit targets  349ms
       ✓ reports hard resets as semantic repo transitions without losing commit_worldline access  421ms
       ✓ keeps checkout epochs unique across repeated branch flips  475ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 6182ms
     ✓ returns working-tree source code for a known symbol  464ms
     ✓ returns an explicit ambiguity response when multiple symbols match  949ms
     ✓ uses WARP for indexed historical reads  1003ms
     ✓ falls back to live parsing for historical reads when WARP is not indexed  543ms
     ✓ finds symbols via live parsing when the repo is not indexed  338ms
     ✓ supports kind filters and directory scoping  304ms
     ✓ normalizes in-repo absolute paths for directory scoping  309ms
     ✓ uses WARP for indexed clean-head symbol search  361ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  396ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 143ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 2075ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1408ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  510ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 6371ms
     ✓ writes correlated start and completion events for tool calls  638ms
     ✓ exposes runtime observability status in doctor  395ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  882ms
     ✓ surfaces bulk-transition guidance when many paths move together  465ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  580ms
     ✓ surfaces merge-phase guidance during active conflicted merges  493ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  532ms
     ✓ forks persisted local history when checkout footing changes  448ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  570ms
     ✓ keeps internal graft logs out of workspace overlay and clean-head checks  313ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 174ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 78ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 6980ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  2351ms
     ✓ offloads dirty precision lookups through child-process workers  1816ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  2719ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 1362ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 9248ms
     ✓ safe_read returns structured JSON with projection  474ms
     ✓ safe_read returns outline for large files  696ms
     ✓ safe_read returns a markdown heading outline for large markdown files  634ms
     ✓ safe_read returns refusal for banned files  473ms
     ✓ file_outline returns outline with jump table  429ms
     ✓ activity_view returns recent bounded local artifact history anchored to the current commit  315ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  420ms
     ✓ tracks session depth across tool calls  907ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 1269ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  586ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 1966ms
     ✓ re-export: export { foo } from './bar' references sym  317ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 20ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 84ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 2403ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  402ms
     ✓ routes heavy daemon repo tools through the scheduler  470ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  789ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (5 tests) 6357ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  1437ms
     ✓ runs an offloaded repo tool on a child-process worker  1137ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1406ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  1188ms
     ✓ runs dirty code_find through the live worker path  1187ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 13ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 2276ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  313ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  443ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  667ms
     ✓ keeps historical denial parity for git-backed precision and structural reads  417ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 1566ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  1485ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1983ms
     ✓ returns a single entry for a newly added symbol  348ms
     ✓ tracks signature changes across commits in tick order  563ms
     ✓ detects removal with present=false  326ms
     ✓ filters by filePath  320ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 4804ms
     ✓ returns diff projection when file changed between reads  549ms
     ✓ diff includes added symbols  550ms
     ✓ diff includes removed symbols  579ms
     ✓ updates observation cache after returning diff  337ms
     ✓ changed_since without consume does not update cache (peek)  349ms
     ✓ changed_since with consume: true updates cache  403ms
     ✓ receipt includes diff projection on changed reads  355ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 1737ms
     ✓ graft_map omits .graftignore-matched files and reports them explicitly  333ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 20ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 5611ms
     ✓ every safe_read response includes a _receipt  389ms
     ✓ every file_outline response includes a _receipt  412ms
     ✓ every read_range response includes a _receipt  515ms
     ✓ seq increments monotonically  450ms
     ✓ receipt on cache hit shows cache_hit projection  343ms
     ✓ tracks non-read burden by tool kind in receipts  369ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 350ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 8ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 140ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 1246ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 3192ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1521ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  813ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  857ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 88ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 68ms
 ✓ test/unit/git/diff.test.ts (17 tests) 2342ms
     ✓ detects rename with content changes  896ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 11ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 8ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 18ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 27ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 4119ms
     ✓ returns creation commit for a newly added function  458ms
     ✓ detects last signature change across commits  1703ms
     ✓ returns reference count for a symbol  725ms
     ✓ returns empty result for unknown symbol  337ms
     ✓ filters by file path when provided  892ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 112ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 2279ms
       ✓ flags a symbol that changed after the doc was committed  1239ms
       ✓ does not flag a symbol that has not changed since the doc  725ms
       ✓ reports unknown symbols not in the WARP graph  301ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 14ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 3774ms
       ✓ returns added symbols for a commit that adds functions  765ms
       ✓ returns changed symbols when a function signature is modified  1129ms
       ✓ returns removed symbols when a function is deleted  723ms
       ✓ returns commits that touched a symbol in order  490ms
       ✓ filters by filePath when provided  663ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 20ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 8ms
 ✓ test/unit/warp/since.test.ts (3 tests) 2550ms
     ✓ detects added symbols between two commits  758ms
     ✓ detects removed symbols between two commits  1224ms
     ✓ detects signature changes between two commits  567ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 2472ms
     ✓ indexes a multi-file repo and resolves import references  790ms
     ✓ handles aliased imports correctly  799ms
     ✓ skips non-parseable files gracefully  303ms
     ✓ emits file nodes for all parsed files  458ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 3145ms
     ✓ detects a stale symbol reference after signature change  830ms
     ✓ passes when docs are fresh (no changes since doc was written)  830ms
     ✓ honors the optional markdown path pattern  852ms
     ✓ produces machine-readable output with file, symbol, and nature  490ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 6832ms
     ✓ safe_read returns content for small files  598ms
     ✓ safe_read returns outline for large files  345ms
     ✓ file_outline includes jump table  495ms
     ✓ doctor returns health check  458ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 2059ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  1390ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  666ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 11ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 10ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 6ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 15ms
 ✓ test/unit/warp/context.test.ts (8 tests) 17ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 22ms
 ✓ test/integration/safe-read.test.ts (9 tests) 235ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 20820ms
     ✓ exports JSON Schema objects for every MCP tool and CLI command  309ms
     ✓ validates representative MCP tool outputs against the declared schemas  4205ms
     ✓ validates representative CLI peer outputs against the declared schemas  16062ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 20ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 18ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 6ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 2084ms
     ✓ counts symbol changes across commits without git log  690ms
     ✓ counts removed symbols discovered from tick receipts  735ms
     ✓ computes change counts through QueryBuilder.aggregate  344ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 8ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 56ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 231ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 9203ms
     ✓ returns content on first read  363ms
     ✓ returns cache_hit on second read of unchanged file  1804ms
     ✓ cache_hit includes outline and jump table  1240ms
     ✓ cache_hit includes readCount  748ms
     ✓ cache_hit includes estimatedBytesAvoided  436ms
     ✓ returns diff when file changes between reads  458ms
     ✓ different files have independent cache entries  550ms
     ✓ file_outline also uses cache on re-read  681ms
     ✓ file_outline cache invalidates when file changes  560ms
     ✓ stats includes cache metrics  588ms
     ✓ cache_hit includes lastReadAt timestamp  369ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  496ms
     ✓ markdown outlines are cached by file_outline once markdown is supported  345ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 11ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 28ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 46ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 13ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 12ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 23ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 10ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 2237ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  554ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  549ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  709ms
     ✓ does not truncate when within limits  422ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 15ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 4451ms
     ✓ returns empty when no symbols have been removed  479ms
     ✓ detects a symbol removed and not re-added  1097ms
     ✓ excludes symbols that were removed then re-added  618ms
     ✓ respects maxCommits to limit search depth  1058ms
     ✓ detects removals across multiple files  1197ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (21 tests) 72ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 2490ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  1153ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  1327ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 2478ms
     ✓ counts references from multiple importing files  706ms
     ✓ returns count=0 for an exported but never imported symbol  429ms
     ✓ distinguishes same-named symbols in different files  797ms
     ✓ counts re-exports as references  354ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 39ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 57ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 3312ms
     ✓ combines aggregate churn curvature with reference friction  1685ms
     ✓ keeps high-churn symbols low risk when no other file references them  687ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  856ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 18ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 734ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  562ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 436ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 204ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 40ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 3214ms
     ✓ finds files that import a named symbol  620ms
     ✓ finds aliased imports  695ms
     ✓ finds multiple referencing files  797ms
     ✓ returns empty for unreferenced symbol  309ms
     ✓ finds namespace imports that reference the file  328ms
     ✓ finds re-exports  464ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 23ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1868ms
     ✓ creates directory nodes from file paths  454ms
     ✓ directory files lens scopes to a subtree  506ms
     ✓ supports structural map query (files + symbols)  900ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 4279ms
     ✓ returns empty map when no files have been read  428ms
     ✓ reports observed files after reads  594ms
     ✓ detects stale files that changed since last read  584ms
     ✓ tracks multiple files  822ms
     ✓ reports correct readCount for re-read files  670ms
     ✓ includes directory coverage summary  472ms
     ✓ staleFiles is empty when nothing changed  699ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 10ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 93ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 5ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 657ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 38ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 183ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 1430ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  1413ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 34ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (5 tests) 1131ms
     ✓ indexes when HEAD differs from lastIndexedCommit  330ms
     ✓ consecutive ticks with same HEAD: second tick skips  317ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 651ms
     ✓ keeps graph state compact and stores the full tree as attached content  646ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 9755ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  7680ms
     ✓ Do ports reject imports from application modules, adapters, primary adapters, and host libraries?  533ms
     ✓ Do current application modules reject direct adapter and host imports?  354ms
     ✓ Do current secondary adapters reject imports from primary adapters?  414ms
     ✓ Does the playback witness prove the guardrails by linting synthetic violations rather than relying on prose claims?  449ms
     ✓ still allows application modules to depend on ports  303ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 10ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 1920ms
     ✓ marks successful captures as outside the bounded-read contract  400ms
     ✓ marks failed captures as outside the bounded-read contract  360ms
     ✓ can be disabled explicitly by configuration  334ms
     ✓ redacts obvious secrets before persisting logs  451ms
     ✓ supports opt-out log persistence  369ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 162ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 28ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 208ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 13ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 7ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 25ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 16ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 21ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 8ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 71ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 11ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 26ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 19ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 125ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 2898ms
     ✓ returns blame info for a symbol from WARP graph without git calls  545ms
     ✓ tracks signature changes in blame history  1574ms
     ✓ includes reference count from WARP graph  556ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 25ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 11ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 37ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 9ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 64ms
 ✓ test/unit/warp/warp-structural-log.test.ts (4 tests) 3088ms
     ✓ returns structural log entries from WARP graph without git log  919ms
     ✓ respects limit parameter  1761ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 11ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 9ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 31ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 14ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 216ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 759ms
     ✓ returns hydrated nodes from a single BFS + query call  460ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 13ms
 ✓ test/unit/operations/state.test.ts (5 tests) 55ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 7ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 202ms
 ✓ test/unit/library/index.test.ts (4 tests) 815ms
     ✓ creates a repo-local graft instance with sensible defaults  780ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 10ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 8936ms
     ✓ renders a human review summary for enhance --since in a temp repo  1378ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  1711ms
     ✓ supports Git external-command invocation through git graft in a temp repo  5842ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 2152ms
     ✓ proxies daemon-only workspace binding flow through stdio  765ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 18ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 13ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 662ms
     ✓ scrubs inherited live-repo Git environment for createServerInRepo  349ms
     ✓ does not eagerly open WARP local-history graph for createServerInRepo  311ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 9ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 113ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 13ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 13ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 15ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 5ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 5ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 10ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 4ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 5ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 5ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 8ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 348ms
     ✓ lets an operator run graft daemon status --socket and see daemon health sessions workspace posture monitors scheduler pressure and worker pressure without raw JSON  346ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 6ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 618ms
     ✓ daemon-bound MCP safe_read refuses absolute paths outside the bound repo  434ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 14ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 4ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 262ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 4ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 6ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 322ms
       ✓ returns SHA→tick map for indexed commits  318ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 11ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 6ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 4ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 219ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 40ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 5ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 5ms
 ✓ test/unit/release/package-library-surface.test.ts (4 tests) 5ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 79ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 4ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 21ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 7ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 4ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/warp/open.test.ts (2 tests) 193ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 5ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 6ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 4242ms
     ✓ monitor nudge triggers an immediate tick that indexes  3998ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 257ms

 Test Files  189 passed (189)
      Tests  1413 passed (1413)
   Start at  15:22:19
   Duration  39.80s (transform 13.82s, setup 0ms, import 92.90s, tests 216.11s, environment 36ms)

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
#5 transferring context: 135.98kB 0.1s done
#5 DONE 0.1s

#6 [deps 3/6] RUN apk add --no-cache git
#6 CACHED

#7 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#7 CACHED

#8 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#8 CACHED

#9 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#9 CACHED

#10 [deps 2/6] WORKDIR /app
#10 CACHED

#11 [test 1/2] WORKDIR /app
#11 CACHED

#12 [test 2/2] COPY . .
#12 DONE 0.2s

#13 exporting to image
#13 exporting layers 0.1s done
#13 writing image sha256:e3bde18eae9bcc2a78ab6add810021298ba9b60c4d9089e0daae592bc1acd85c done
#13 naming to docker.io/library/graft-test:local done
#13 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/uk8mav83x7c2seix3y41g100j

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 7 playback questions, 238 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_migrate-path-ops-to-port`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_migrate-path-ops-to-port
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
