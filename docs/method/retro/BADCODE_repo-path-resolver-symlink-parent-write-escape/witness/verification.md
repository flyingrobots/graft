---
title: "Verification Witness for Cycle BADCODE_repo-path-resolver-symlink-parent-write-escape"
---

# Verification Witness for Cycle BADCODE_repo-path-resolver-symlink-parent-write-escape

This witness proves that `Repo path resolver can miss symlink-parent escapes for future writes` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 1654ms
     ✓ retains full read-event history in the WARP graph  1526ms
 ✓ test/unit/cli/init.test.ts (28 tests) 371ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 81ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 2663ms
     ✓ classifies parameter type changes as major semver impact  309ms
     ✓ classifies exported return type changes as major semver impact  347ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 23ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 2371ms
     ✓ categorizes structural vs formatting files  335ms
     ✓ renders a human-readable summary  336ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 34ms
 ✓ test/unit/cli/main.test.ts (20 tests) 5007ms
     ✓ runs doctor sludge scan through the top-level doctor alias  926ms
     ✓ runs peer commands through the grouped CLI surface  1051ms
     ✓ runs symbol difficulty through the grouped CLI surface  1118ms
     ✓ runs diag activity through the grouped CLI surface  365ms
     ✓ renders human-friendly diag activity output by default  806ms
     ✓ renders a bounded local-history DAG from WARP-backed history  572ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 6158ms
       ✓ labels historical symbol reads as commit_worldline  1508ms
       ✓ labels branch/ref structural comparisons as ref_view  591ms
       ✓ labels dirty working-tree answers as workspace_overlay  427ms
       ✓ labels default structural diffs against the working tree as workspace_overlay  330ms
       ✓ doctor reports checkout epochs and semantic checkout transitions  324ms
       ✓ reports hard resets as semantic repo transitions without losing commit_worldline access  404ms
       ✓ reports rebases as semantic repo transitions while preserving ref_view queries  463ms
       ✓ keeps checkout epochs unique across repeated branch flips  745ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 211ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 8018ms
     ✓ returns working-tree source code for a known symbol  710ms
     ✓ returns not found for an unknown symbol  414ms
     ✓ returns an explicit ambiguity response when multiple symbols match  1055ms
     ✓ uses WARP for indexed historical reads  1033ms
     ✓ falls back to live parsing for historical reads when WARP is not indexed  509ms
     ✓ finds symbols via live parsing when the repo is not indexed  319ms
     ✓ supports case-insensitive substring discovery for plain queries  341ms
     ✓ supports kind filters and directory scoping  396ms
     ✓ normalizes in-repo absolute paths for directory scoping  339ms
     ✓ returns empty results for a miss  369ms
     ✓ uses WARP for indexed clean-head symbol search  664ms
     ✓ supports case-insensitive substring discovery on indexed clean-head repos  578ms
     ✓ falls back to live search when indexed repos have dirty working-tree edits  338ms
     ✓ returns an explicit refusal when every matching symbol is hidden by .graftignore  351ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 8026ms
     ✓ writes correlated start and completion events for tool calls  807ms
     ✓ exposes runtime observability status in doctor  601ms
     ✓ surfaces a full-file runtime staged target for staged rename selections  850ms
     ✓ surfaces bulk-transition guidance when many paths move together  505ms
     ✓ activity_view surfaces a bounded recent event window with anchor and degradation context  641ms
     ✓ summarizes many staged paths as bulk staging  336ms
     ✓ surfaces merge-phase guidance during active conflicted merges  515ms
     ✓ surfaces rebase-phase guidance during active conflicted rebases  661ms
     ✓ forks persisted local history when checkout footing changes  514ms
     ✓ upgrades checkout-boundary continuity evidence when installed hooks observe the transition  921ms
     ✓ keeps internal graft logs out of workspace overlay and clean-head checks  493ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  387ms
     ✓ surfaces hook-observed checkout boundaries after an installed transition hook fires  502ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 3151ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  1955ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  1024ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 228ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 71ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 8998ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  2748ms
     ✓ offloads dirty precision lookups through child-process workers  2036ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  4079ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 2532ms
     ✓ includes summary line per file  462ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 12477ms
     ✓ safe_read returns structured JSON with projection  487ms
     ✓ safe_read returns outline for large files  652ms
     ✓ safe_read returns a markdown heading outline for large markdown files  747ms
     ✓ safe_read returns refusal for banned files  575ms
     ✓ safe_read returns refusal for files matched by .graftignore  356ms
     ✓ file_outline returns outline with jump table  315ms
     ✓ file_outline returns a markdown heading outline  393ms
     ✓ read_range returns bounded content  339ms
     ✓ doctor returns sludge signals when requested  351ms
     ✓ activity_view returns recent bounded local artifact history anchored to the current commit  572ms
     ✓ causal_attach records explicit attach evidence after a continuity fork  691ms
     ✓ stats and doctor expose non-read burden breakdowns  525ms
     ✓ budget appears in receipt after set_budget  464ms
     ✓ budget tightens byte cap for large files  316ms
     ✓ code_find refuses banned file paths via middleware  324ms
     ✓ rejects unknown keys in tool arguments  685ms
     ✓ tracks session depth across tool calls  1335ms
     ✓ includes tripwire in response when triggered  309ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 1766ms
     ✓ writes target-repo git transition hooks with an explicit flag  338ms
     ✓ surfaces installed target-repo git hooks without pretending local edit reactivity  710ms
     ✓ surfaces hook-observed checkout boundaries after an installed transition hook fires  431ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 21ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 4175ms
     ✓ binds a daemon session to a repo and enables repo-scoped tools  603ms
     ✓ routes heavy daemon repo tools through the scheduler  940ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  1431ms
     ✓ denies run_capture in daemon mode after bind  336ms
     ✓ allows run_capture when authorization explicitly enables it  380ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 3582ms
     ✓ named import: references sym node in target file  476ms
     ✓ aliased import: import { foo as baz } references foo  502ms
     ✓ default import: import foo from './bar' references default  650ms
     ✓ namespace import: import * as ns references the file  498ms
     ✓ re-export: export { foo } from './bar' references sym  413ms
 ✓ test/unit/parser/outline.test.ts (15 tests) 114ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (5 tests) 10257ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  2422ms
     ✓ runs an offloaded repo tool on a child-process worker  1929ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  2486ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  1601ms
     ✓ runs dirty code_find through the live worker path  1816ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 20ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 2672ms
     ✓ returns a single entry for a newly added symbol  332ms
     ✓ tracks signature changes across commits in tick order  748ms
     ✓ detects removal with present=false  611ms
     ✓ filters by filePath  443ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 3531ms
     ✓ keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools  550ms
     ✓ keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools  332ms
     ✓ keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools  478ms
     ✓ keeps .graftignore denial parity across precision and structural MCP tools  804ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  862ms
     ✓ keeps historical denial parity for git-backed precision and structural reads  502ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 2286ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  2173ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 7042ms
     ✓ returns diff projection when file changed between reads  1417ms
     ✓ diff includes added symbols  819ms
     ✓ diff includes removed symbols  513ms
     ✓ diff includes changed signatures with old and new values  414ms
     ✓ includes full new outline alongside diff  526ms
     ✓ updates observation cache after returning diff  438ms
     ✓ changed_since tool returns diff without full read  363ms
     ✓ changed_since returns no-observation when file never read  302ms
     ✓ changed_since returns unchanged when file hasn't changed  477ms
     ✓ changed_since without consume does not update cache (peek)  457ms
     ✓ changed_since checks policy and refuses banned files  361ms
     ✓ changed_since with consume: true updates cache  365ms
     ✓ receipt includes diff projection on changed reads  329ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 2564ms
     ✓ graft_map includes untracked working-tree files  345ms
     ✓ graft_map normalizes in-repo absolute path scopes  357ms
     ✓ graft_map depth 0 returns direct files and summarized child directories for one-call orientation  453ms
     ✓ graft_map summary mode reports symbol counts without emitting per-symbol payloads  417ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 7ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 8151ms
     ✓ every safe_read response includes a _receipt  551ms
     ✓ every file_outline response includes a _receipt  993ms
     ✓ every read_range response includes a _receipt  797ms
     ✓ every stats response includes a _receipt  371ms
     ✓ every doctor response includes a _receipt  345ms
     ✓ receipt has correct shape  332ms
     ✓ sessionId is stable across calls  574ms
     ✓ traceId differs per call  419ms
     ✓ seq increments monotonically  661ms
     ✓ receipt includes fileBytes for file operations  428ms
     ✓ receipt has null fileBytes for non-file operations  362ms
     ✓ cumulative counters accumulate across calls  444ms
     ✓ receipt on cache hit shows cache_hit projection  349ms
     ✓ compressionRatio is returnedBytes / fileBytes for file operations  312ms
     ✓ tracks non-read burden by tool kind in receipts  414ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 3414ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  1819ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  895ms
     ✓ surfaces divergent checkout posture for same-repo daemon sessions on different worktrees  697ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 12ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 358ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 62ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 211ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 40ms
 ✓ test/unit/git/diff.test.ts (17 tests) 1275ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 1431ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 27ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 9ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 17ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 6ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 12ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 17ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 2473ms
     ✓ returns creation commit for a newly added function  426ms
     ✓ detects last signature change across commits  964ms
     ✓ returns reference count for a symbol  406ms
     ✓ filters by file path when provided  522ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 2108ms
       ✓ flags a symbol that changed after the doc was committed  938ms
       ✓ does not flag a symbol that has not changed since the doc  818ms
       ✓ reports unknown symbols not in the WARP graph  343ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 16ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 14ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 3338ms
       ✓ returns added symbols for a commit that adds functions  454ms
       ✓ returns changed symbols when a function signature is modified  701ms
       ✓ returns removed symbols when a function is deleted  979ms
       ✓ returns commits that touched a symbol in order  665ms
       ✓ filters by filePath when provided  530ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 10ms
 ✓ test/unit/warp/since.test.ts (3 tests) 2634ms
     ✓ detects added symbols between two commits  1236ms
     ✓ detects removed symbols between two commits  884ms
     ✓ detects signature changes between two commits  512ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 2126ms
     ✓ indexes a multi-file repo and resolves import references  874ms
     ✓ handles aliased imports correctly  698ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 4479ms
     ✓ safe_read returns content for small files  609ms
     ✓ safe_read returns outline for large files  312ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 2752ms
     ✓ detects a stale symbol reference after signature change  1088ms
     ✓ passes when docs are fresh (no changes since doc was written)  830ms
     ✓ honors the optional markdown path pattern  463ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 1551ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  1047ms
     ✓ keeps monitor control behind authorized workspaces and one monitor per repo  501ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 10ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 17ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 29ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 17ms
 ✓ test/unit/warp/context.test.ts (8 tests) 17ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 35ms
 ✓ test/integration/safe-read.test.ts (9 tests) 160ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 40ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 18ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 7ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 17ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 246ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 2297ms
     ✓ counts symbol changes across commits without git log  884ms
     ✓ counts removed symbols discovered from tick receipts  821ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 82ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 24624ms
     ✓ validates representative MCP tool outputs against the declared schemas  4801ms
     ✓ validates representative CLI peer outputs against the declared schemas  19234ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 14ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 32ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 7963ms
     ✓ returns content on first read  527ms
     ✓ returns cache_hit on second read of unchanged file  594ms
     ✓ cache_hit includes outline and jump table  615ms
     ✓ cache_hit includes readCount  812ms
     ✓ cache_hit includes estimatedBytesAvoided  562ms
     ✓ returns diff when file changes between reads  626ms
     ✓ different files have independent cache entries  518ms
     ✓ file_outline also uses cache on re-read  441ms
     ✓ file_outline cache invalidates when file changes  401ms
     ✓ stats includes cache metrics  848ms
     ✓ cache_hit includes lastReadAt timestamp  524ms
     ✓ banned files are not cached (still refused on re-read)  346ms
     ✓ markdown outlines are cached by safe_read once markdown is supported  324ms
     ✓ markdown outlines are cached by file_outline once markdown is supported  450ms
     ✓ changed_since reports structural diffs for markdown headings  371ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 52ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 29ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 12ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 16ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 9ms
 ✓ test/unit/mcp/map-truncation.test.ts (4 tests) 2107ms
     ✓ truncates to summary-only when file count exceeds MAX_MAP_FILES  590ms
     ✓ truncates to summary-only when response bytes exceed MAX_MAP_BYTES  515ms
     ✓ returns summary-only with BUDGET_EXHAUSTED when session budget is drained  612ms
     ✓ does not truncate when within limits  379ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 12ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 2212ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  1200ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  1007ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 4877ms
     ✓ returns empty when no symbols have been removed  606ms
     ✓ detects a symbol removed and not re-added  1183ms
     ✓ excludes symbols that were removed then re-added  762ms
     ✓ respects maxCommits to limit search depth  1093ms
     ✓ detects removals across multiple files  1230ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 2630ms
     ✓ counts references from multiple importing files  839ms
     ✓ returns count=0 for an exported but never imported symbol  396ms
     ✓ distinguishes same-named symbols in different files  715ms
     ✓ counts re-exports as references  431ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 16ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 86ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (6 tests) 26ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 941ms
     ✓ Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?  837ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 3409ms
     ✓ combines aggregate churn curvature with reference friction  1820ms
     ✓ keeps high-churn symbols low risk when no other file references them  689ms
     ✓ returns duplicate symbol matches ranked by score when path is omitted  828ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 179ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 22ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 1711ms
     ✓ creates directory nodes from file paths  491ms
     ✓ directory files lens scopes to a subtree  574ms
     ✓ supports structural map query (files + symbols)  643ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 482ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 3507ms
     ✓ finds files that import a named symbol  641ms
     ✓ finds aliased imports  755ms
     ✓ finds multiple referencing files  1060ms
     ✓ finds namespace imports that reference the file  349ms
     ✓ finds re-exports  397ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 42ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 8ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 63ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 16ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (2 tests) 4ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 361ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 4209ms
     ✓ returns empty map when no files have been read  415ms
     ✓ reports observed files after reads  656ms
     ✓ detects stale files that changed since last read  681ms
     ✓ tracks multiple files  944ms
     ✓ reports correct readCount for re-read files  725ms
     ✓ includes directory coverage summary  354ms
     ✓ staleFiles is empty when nothing changed  433ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 15ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 144ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 8487ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  7128ms
     ✓ Do ports reject imports from application modules, adapters, primary adapters, and host libraries?  417ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 784ms
     ✓ lists bounded repo rows with worktree and monitor summary and supports filtering  737ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 80ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 10ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 11ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (5 tests) 877ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 14ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 1671ms
     ✓ marks successful captures as outside the bounded-read contract  352ms
     ✓ supports opt-out log persistence  459ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 111ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 135ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 22ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 11ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 415ms
     ✓ keeps graph state compact and stores the full tree as attached content  413ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (3 tests) 13ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 7ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 61ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 9ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 7ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 6ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 27ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 8ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 134ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 6ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 2262ms
     ✓ returns blame info for a symbol from WARP graph without git calls  525ms
     ✓ tracks signature changes in blame history  1115ms
     ✓ includes reference count from WARP graph  430ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 7ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 7ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 44ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 8ms
 ✓ test/unit/warp/warp-structural-log.test.ts (4 tests) 2063ms
     ✓ returns structural log entries from WARP graph without git log  774ms
     ✓ respects limit parameter  1068ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 74ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 6ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 10ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 528ms
     ✓ returns hydrated nodes from a single BFS + query call  354ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 9ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 11ms
 ✓ test/unit/operations/state.test.ts (5 tests) 37ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 9ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 1399ms
     ✓ proxies daemon-only workspace binding flow through stdio  496ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 166ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 4ms
 ✓ test/unit/library/index.test.ts (4 tests) 573ms
     ✓ creates a repo-local graft instance with sensible defaults  550ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 6ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 5ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 6155ms
     ✓ renders a human review summary for enhance --since in a temp repo  1156ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  979ms
     ✓ supports Git external-command invocation through git graft in a temp repo  4017ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 10ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 19ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 572ms
     ✓ does not eagerly open WARP local-history graph for createServerInRepo  306ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 85ms
 ✓ test/unit/parser/lang.test.ts (8 tests) 7ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 5ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 9ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 5ms
 ✓ test/unit/release/docker-test-isolation.test.ts (3 tests) 6ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 4ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 4ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (2 tests) 4ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 5ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 213ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 6ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 5ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 12ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 468ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 211ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 4ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 4ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 7ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 206ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 6ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 5ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 8ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 150ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 28ms
 ✓ test/unit/cli/command-parser.test.ts (2 tests) 5ms
 ✓ test/unit/release/package-library-surface.test.ts (4 tests) 4ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 4ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 8ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 40ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 4ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (2 tests) 3ms
 ✓ test/unit/cli/index-cmd.test.ts (2 tests) 5ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 4ms
 ✓ test/unit/version.test.ts (1 test) 3ms
 ✓ test/unit/warp/open.test.ts (2 tests) 126ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 6ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 3303ms
     ✓ monitor nudge triggers an immediate tick that indexes  3050ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 266ms

 Test Files  190 passed (190)
      Tests  1421 passed (1421)
   Start at  15:17:29
   Duration  40.62s (transform 14.68s, setup 0ms, import 91.28s, tests 231.61s, environment 17ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.24kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.5s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 134.78kB 0.1s done
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
#12 DONE 0.3s

#13 exporting to image
#13 exporting layers 0.1s done
#13 writing image sha256:3ff934d58f9b6b655a70dc5593dc856b2ece3e8361200dc3e3bd3892e6a6ef59 done
#13 naming to docker.io/library/graft-test:local done
#13 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/l3koqrly5u2nsdnsfyphxwxdz

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 4 playback questions, 242 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift BADCODE_repo-path-resolver-symlink-parent-write-escape`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift BADCODE_repo-path-resolver-symlink-parent-write-escape
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
