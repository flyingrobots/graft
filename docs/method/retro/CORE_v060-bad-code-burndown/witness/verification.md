---
title: "Verification Witness for Cycle CORE_v060-bad-code-burndown"
---

# Verification Witness for Cycle CORE_v060-bad-code-burndown

This witness proves that `v0.6.0 bad-code burndown` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.5.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [31m❯[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 3011[2mms[22m[39m
[31m     [31m×[31m graft_map depth 0 returns direct files and summarized child directories for one-call orientation[39m[33m 1013[2mms[22m[39m
[31m     [31m×[31m graft_map summary mode reports symbol counts without emitting per-symbol payloads[39m[33m 1991[2mms[22m[39m
 [31m❯[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 19[2mms[22m[39m
     [32m✓[39m Can a human point to one repo-visible WARP port contract instead of discovering graph capabilities by reading scattered raw `WarpApp` call sites?[32m 2[2mms[22m[39m
     [32m✓[39m Can a human see that shared MCP and CLI code talk to an explicit WARP handle type rather than importing `@git-stunts/git-warp` directly?[32m 0[2mms[22m[39m
     [32m✓[39m Is the local-history graph seam no longer a cast-based “trust me” adapter?[32m 0[2mms[22m[39m
     [32m✓[39m Does `src/ports/warp.ts` define the WARP handle, observer, patch, and materialization contract used by the rest of the repo?[32m 3[2mms[22m[39m
     [32m✓[39m Does `openWarp()` return that port handle while keeping raw `@git-stunts/git-warp` usage inside the adapter layer?[32m 0[2mms[22m[39m
[31m     [31m×[31m Do MCP and CLI surfaces use the port type for pooling, context, precision reads, and local-history graph access?[39m[32m 11[2mms[22m[39m
     [32m✓[39m Is there a playback witness that mechanically proves the boundary instead of leaving it as a refactor-by-convention?[32m 1[2mms[22m[39m
 [31m❯[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 4585[2mms[22m[39m
     [32m✓[39m Can an external app create a repo-local workspace and call direct governed read methods without going through MCP receipts?[32m 277[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 4293[2mms[22m[39m
     [32m✓[39m Is the observation cache still outside the `mcp` adapter?[32m 1[2mms[22m[39m
     [32m✓[39m Is path resolution still outside the `mcp` adapter?[32m 0[2mms[22m[39m
[31m     [31m×[31m Are the read-family tool handlers thinner after the slice?[39m[32m 13[2mms[22m[39m
 [31m❯[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 5841[2mms[22m[39m
[31m     [31m×[31m Can a human point to the currently enforced layers without having to infer them from code archaeology?[39m[32m 5[2mms[22m[39m
[31m     [31m×[31m Is it explicit that this cycle enforces a truthful first-cut map, not a final directory reorganization?[39m[32m 0[2mms[22m[39m
     [32m✓[39m Does `ARCHITECTURE.md` stop claiming the repo is already strict hexagonal in full?[32m 1[2mms[22m[39m
[31m     [31m×[31m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?[39m[33m 5454[2mms[22m[39m
     [32m✓[39m Do ports reject imports from application modules, adapters, primary adapters, and host libraries?[32m 99[2mms[22m[39m
     [32m✓[39m Do current application modules reject direct adapter and host imports?[32m 91[2mms[22m[39m
     [32m✓[39m Do current secondary adapters reject imports from primary adapters?[32m 67[2mms[22m[39m
     [32m✓[39m Does the playback witness prove the guardrails by linting synthetic violations rather than relying on prose claims?[32m 66[2mms[22m[39m
     [32m✓[39m still allows application modules to depend on ports[32m 57[2mms[22m[39m
 [31m❯[39m test/integration/mcp/daemon-bridge.test.ts [2m([22m[2m1 test[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 5198[2mms[22m[39m
[31m     [31m×[31m proxies daemon-only workspace binding flow through stdio[39m[32m 9[2mms[22m[39m
 [31m❯[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 10262[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 1484[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 2326[2mms[22m[39m
[31m     [31m×[31m graft_map depth 0 returns direct files and summarized child directories for one-call orientation[39m[33m 890[2mms[22m[39m
[31m     [31m×[31m graft_map summary mode reports symbol counts without emitting per-symbol payloads[39m[33m 628[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1250[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 1719[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1088[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 873[2mms[22m[39m
 [31m❯[39m test/unit/mcp/project-root-resolution.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 10665[2mms[22m[39m
     [33m[2m✓[22m[39m uses explicit projectRoot over GRAFT_PROJECT_ROOT env var [33m 656[2mms[22m[39m
[31m     [31m×[31m uses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided[39m[33m 5006[2mms[22m[39m
[31m     [31m×[31m falls back gracefully when neither projectRoot nor env var is set[39m[33m 5001[2mms[22m[39m
 [31m❯[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 20961[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1484[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 2311[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1114[2mms[22m[39m
[31m     [31m×[31m uses WARP for indexed historical reads[39m[33m 3335[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 984[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 771[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 817[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 975[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 1806[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 1368[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 876[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 778[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 304[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1342[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1040[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 987[2mms[22m[39m
     [32m✓[39m assigns distinct jump-table ranges to duplicate symbol names[32m 0[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 663[2mms[22m[39m
 [31m❯[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m15 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 21784[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 2012[2mms[22m[39m
     [33m[2m✓[22m[39m includes region footprint for read_range tool calls [33m 2322[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 507[2mms[22m[39m
[31m     [31m×[31m exposes runtime observability status in doctor[39m[33m 672[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 2110[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 1274[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 1033[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 2508[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 2442[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 1308[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 1797[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 976[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 788[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 958[2mms[22m[39m
 [31m❯[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 23382[2mms[22m[39m
     [32m✓[39m declares an MCP output schema for every registered tool[32m 2[2mms[22m[39m
     [32m✓[39m exports JSON Schema objects for every MCP tool and CLI command[32m 121[2mms[22m[39m
     [32m✓[39m preserves concrete CLI output types through the helper stack[32m 41[2mms[22m[39m
[31m     [31m×[31m validates representative MCP tool outputs against the declared schemas[39m[33m 12948[2mms[22m[39m
     [32m✓[39m validates init JSON output against the declared CLI schema[32m 150[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 729[2mms[22m[39m
[31m     [31m×[31m validates representative CLI peer outputs against the declared schemas[39m[33m 8811[2mms[22m[39m
     [33m[2m✓[22m[39m validates local-history migration JSON output against the declared CLI schema [33m 578[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13414[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 920[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1194[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1555[2mms[22m[39m
     [33m[2m✓[22m[39m preserves canonical identity across a same-file rename when indexing incrementally [33m 1323[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 940[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1051[2mms[22m[39m
     [33m[2m✓[22m[39m preserves canonical identity across a git-reported file rename [33m 1090[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 462[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 478[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 719[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 472[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1211[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 1852[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 18765[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 1627[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 1581[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 1003[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1448[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 2298[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 1708[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 937[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 939[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 1013[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 1215[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 791[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 603[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 1052[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 1272[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 1277[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 18844[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 2541[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 1033[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 1283[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes likely rename continuity when a symbol keeps the same shape under a new name [33m 1968[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 1750[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1323[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 1050[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 621[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 773[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 1030[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 791[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 689[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 1414[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 1501[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 15373[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 997[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 1344[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 1138[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 729[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 643[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 674[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 879[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 969[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 1003[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 580[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 476[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 829[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 593[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 1129[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 1037[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 697[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 692[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 800[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 25885[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 3346[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 897[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1312[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 1059[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 2895[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 931[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 866[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 1057[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1331[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 971[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1284[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1699[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 2198[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 6035[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 11939[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 2574[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 2428[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 6781[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 30435[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 976[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 1752[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 1008[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 584[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 569[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 839[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 817[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 1777[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 1387[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 813[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 589[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 617[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 693[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 1170[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 1238[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 790[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 641[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 1078[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 1328[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 786[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 521[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 626[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 1611[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 723[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 615[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 1096[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 907[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 3324[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 909[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 11127[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 3234[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 2357[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 3912[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1623[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 9667[2mms[22m[39m
     [33m[2m✓[22m[39m shares daemon-wide workspace authorization and bound session state across sessions on the same repo [33m 4792[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 3055[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 1818[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 10124[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 2227[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 551[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1987[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 2951[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 678[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1058[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 307[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 7966[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1499[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1655[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 543[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 2807[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1456[2mms[22m[39m
 [32m✓[39m tests/playback/0091-canonical-symbol-identity-across-files-and-commits.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 10470[2mms[22m[39m
     [33m[2m✓[22m[39m Does an indexed symbol keep the same canonical sid identity when a function is renamed in place across commits? [33m 2441[2mms[22m[39m
     [33m[2m✓[22m[39m Does a git-reported file move preserve the same canonical sid identity and expose it through indexed precision reads? [33m 3574[2mms[22m[39m
     [33m[2m✓[22m[39m Does the WARP indexer seed identity from prior graph truth through observers instead of mining materialization receipts? [33m 1954[2mms[22m[39m
     [33m[2m✓[22m[39m Do indexed precision surfaces expose canonical identity without pretending live parse or address keys are themselves stable identity? [33m 2500[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 16944[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1852[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1097[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 2318[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 2832[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 6972[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1868[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 6720[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1199[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 954[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 1007[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 1649[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 980[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 929[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6015[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 1808[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2628[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1578[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 3934[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2810[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1123[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4593[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 465[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 615[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 721[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 718[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 387[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 528[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 344[2mms[22m[39m
 [32m✓[39m tests/playback/0088-target-repo-git-hook-bootstrap.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3509[2mms[22m[39m
     [33m[2m✓[22m[39m writes target-repo git transition hooks with an explicit flag [33m 578[2mms[22m[39m
     [33m[2m✓[22m[39m respects configured core.hooksPath and preserves external target-repo hooks [33m 308[2mms[22m[39m
     [33m[2m✓[22m[39m installed target-repo git hooks append transition events when executed [33m 497[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1150[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 945[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 3860[2mms[22m[39m
     [33m[2m✓[22m[39m Is `GitClient` async and backed by `@git-stunts/plumbing` instead of synchronous shell execution? [33m 327[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1962[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1530[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4047[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 1340[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 657[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 725[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 610[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 714[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5177[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 481[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 438[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 302[2mms[22m[39m
 [32m✓[39m test/unit/mcp/worktree-identity-canonicalization.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 604[2mms[22m[39m
     [33m[2m✓[22m[39m produces the same worktreeId regardless of /tmp vs /private/tmp aliasing [33m 375[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 725[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 353[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2172[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 304[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 1808[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 573[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 694[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 540[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 233[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 840[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1023[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 997[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 143[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 127[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 180[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 181[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1644[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1541[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 740[2mms[22m[39m
     [33m[2m✓[22m[39m installed target-repo git hooks append transition events when executed [33m 303[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 75[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 237[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m tests/playback/0089-logical-warp-writer-lanes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 551[2mms[22m[39m
 [32m✓[39m test/unit/ports/filesystem-contract.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-stdio-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-bad-code-burndown.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tool-call-footprint.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt-builder.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/adapters/repo-paths-invariants.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/secret-scrub.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0090-symbol-identity-and-rename-continuity.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/operations/diff-identity.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/metrics/metrics.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [31m❯[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [31m❯[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/ports/guards.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [31m❯[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [31m❯[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [31m❯[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [31m❯[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/ports/codec-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [31m❯[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [31m❯[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/context-guard.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/warp-plumbing-conformance.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/cli/index-cmd.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[31m19 failed[39m[22m[2m | [22m[1m[32m102 passed[39m[22m[90m (121)[39m
[2m      Tests [22m [1m[31m16 failed[39m[22m[2m | [22m[1m[32m936 passed[39m[22m[90m (952)[39m
[2m   Start at [22m 06:38:02
[2m   Duration [22m 46.36s[2m (transform 5.39s, setup 0ms, import 35.07s, tests 356.79s, environment 15ms)[22m


[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 9 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts[2m [ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0059-graph-ontology-and-causal-collapse-model/graph-ontology-and-causal-collapse-model.md'[39m
[36m [2m❯[22m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts:[2m11:22[22m[39m
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m const invariantsReadmePath = path.join(repoRoot, "docs/invariants/READ…
    [90m 11|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 12|[39m const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8"…
    [90m 13|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0060-persisted-sub-commit-local-history.test.ts[2m [ tests/playback/0060-persisted-sub-commit-local-history.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0060-persisted-sub-commit-local-history/persisted-sub-commit-local-history.md'[39m
[36m [2m❯[22m tests/playback/0060-persisted-sub-commit-local-history.test.ts:[2m11:22[22m[39m
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m const invariantsReadmePath = path.join(repoRoot, "docs/invariants/READ…
    [90m 11|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 12|[39m const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8"…
    [90m 13|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0061-provenance-attribution-instrumentation.test.ts[2m [ tests/playback/0061-provenance-attribution-instrumentation.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0061-provenance-attribution-instrumentation/provenance-attribution-instrumentation.md'[39m
[36m [2m❯[22m tests/playback/0061-provenance-attribution-instrumentation.test.ts:[2m11:22[22m[39m
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m const invariantsReadmePath = path.join(repoRoot, "docs/invariants/READ…
    [90m 11|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 12|[39m const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8"…
    [90m 13|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0062-reactive-workspace-overlay.test.ts[2m [ tests/playback/0062-reactive-workspace-overlay.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0062-reactive-workspace-overlay/reactive-workspace-overlay.md'[39m
[36m [2m❯[22m tests/playback/0062-reactive-workspace-overlay.test.ts:[2m10:22[22m[39m
    [90m  8|[39m   "docs/design/0062-reactive-workspace-overlay/reactive-workspace-over…
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 11|[39m
    [90m 12|[39m [35mfunction[39m [34mexpectMentions[39m(text[33m:[39m string[33m,[39m terms[33m:[39m string[]) {

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0063-richer-semantic-transitions.test.ts[2m [ tests/playback/0063-richer-semantic-transitions.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0063-richer-semantic-transitions/richer-semantic-transitions.md'[39m
[36m [2m❯[22m tests/playback/0063-richer-semantic-transitions.test.ts:[2m10:22[22m[39m
    [90m  8|[39m   "docs/design/0063-richer-semantic-transitions/richer-semantic-transi…
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 11|[39m
    [90m 12|[39m [35mfunction[39m [34mexpectMentions[39m(text[33m:[39m string[33m,[39m terms[33m:[39m string[]) {

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0064-same-repo-concurrent-agent-model.test.ts[2m [ tests/playback/0064-same-repo-concurrent-agent-model.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0064-same-repo-concurrent-agent-model/same-repo-concurrent-agent-model.md'[39m
[36m [2m❯[22m tests/playback/0064-same-repo-concurrent-agent-model.test.ts:[2m10:22[22m[39m
    [90m  8|[39m   "docs/design/0064-same-repo-concurrent-agent-model/same-repo-concurr…
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 11|[39m
    [90m 12|[39m [35mfunction[39m [34mexpectMentions[39m(text[33m:[39m string[33m,[39m terms[33m:[39m string[]) {

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0065-between-commit-activity-view.test.ts[2m [ tests/playback/0065-between-commit-activity-view.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0065-between-commit-activity-view/between-commit-activity-view.md'[39m
[36m [2m❯[22m tests/playback/0065-between-commit-activity-view.test.ts:[2m10:22[22m[39m
    [90m  8|[39m   "docs/design/0065-between-commit-activity-view/between-commit-activi…
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 11|[39m
    [90m 12|[39m [35mfunction[39m [34mexpectMentions[39m(text[33m:[39m string[33m,[39m terms[33m:[39m string[]) {

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0074-local-causal-history-graph-schema.test.ts[2m [ tests/playback/0074-local-causal-history-graph-schema.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0074-local-causal-history-graph-schema/local-causal-history-graph-schema.md'[39m
[36m [2m❯[22m tests/playback/0074-local-causal-history-graph-schema.test.ts:[2m11:22[22m[39m
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m const causalOntologyPath = path.join(repoRoot, "src/contracts/causal-o…
    [90m 11|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 12|[39m [35mconst[39m causalOntology [33m=[39m fs[33m.[39m[34mreadFileSync[39m(causalOntologyPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m 13|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts[2m [ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts ][22m
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0075-hexagonal-architecture-convergence-plan/hexagonal-architecture-convergence-plan.md'[39m
[36m [2m❯[22m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts:[2m11:22[22m[39m
    [90m  9|[39m )[33m;[39m
    [90m 10|[39m [35mconst[39m architectureDocPath [33m=[39m path[33m.[39m[34mjoin[39m(repoRoot[33m,[39m [32m"ARCHITECTURE.md"[39m)[33m;[39m
    [90m 11|[39m [35mconst[39m designDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(designDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m   |[39m                      [31m^[39m
    [90m 12|[39m [35mconst[39m architectureDoc [33m=[39m fs[33m.[39m[34mreadFileSync[39m(architectureDocPath[33m,[39m [32m"utf-8"[39m)[33m;[39m
    [90m 13|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/25]⎯[22m[39m


[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 16 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts[2m > [22m0076 hex layer map and dependency guardrails[2m > [22mCan a human point to the currently enforced layers without having to infer them from code archaeology?
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-layer-map-and-dependency-guardrails.md'[39m
[36m [2m❯[22m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts:[2m34:23[22m[39m
    [90m 32|[39m [34mdescribe[39m([32m"0076 hex layer map and dependency guardrails"[39m[33m,[39m () [33m=>[39m {
    [90m 33|[39m   it("Can a human point to the currently enforced layers without havin…
    [90m 34|[39m     [35mconst[39m designDoc [33m=[39m [35mawait[39m [34mreadRepoText[39m(
    [90m   |[39m                       [31m^[39m
    [90m 35|[39m       "docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-la…
    [90m 36|[39m     )[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts[2m > [22m0076 hex layer map and dependency guardrails[2m > [22mIs it explicit that this cycle enforces a truthful first-cut map, not a final directory reorganization?
[31m[1mError[22m: ENOENT: no such file or directory, open './docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-layer-map-and-dependency-guardrails.md'[39m
[36m [2m❯[22m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts:[2m47:23[22m[39m
    [90m 45|[39m
    [90m 46|[39m   it("Is it explicit that this cycle enforces a truthful first-cut map…
    [90m 47|[39m     [35mconst[39m designDoc [33m=[39m [35mawait[39m [34mreadRepoText[39m(
    [90m   |[39m                       [31m^[39m
    [90m 48|[39m       "docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-la…
    [90m 49|[39m     )[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts[2m > [22m0076 hex layer map and dependency guardrails[2m > [22mDo contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts:[2m64:3[22m[39m
    [90m 62|[39m   })[33m;[39m
    [90m 63|[39m
    [90m 64|[39m   it("Do contracts and pure helpers reject imports from ports, applica…
    [90m   |[39m   [31m^[39m
    [90m 65|[39m     [35mconst[39m messages [33m=[39m [35mawait[39m [34mlintRestrictedImports[39m(
    [90m 66|[39m       [32m'import { createGraftServer } from "../mcp/server.js";\n'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts[2m > [22m0077 primary adapters thin use-case extraction[2m > [22mAre the read-family tool handlers thinner after the slice?
[31m[1mAssertionError[22m: expected 'import { z } from "zod";\nimport { sa…' to contain 'createRepoWorkspaceFromToolContext'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- createRepoWorkspaceFromToolContext[39m
[31m+ import { z } from "zod";[39m
[31m+ import { safeRead, type SafeReadResult } from "../../operations/safe-read.js";[39m
[31m+ import { toJsonObject } from "../../operations/result-dto.js";[39m
[31m+ import { RefusedResult } from "../../policy/types.js";[39m
[31m+ import { diffOutlines } from "../../parser/diff.js";[39m
[31m+ import { CachedFile } from "../cached-file.js";[39m
[31m+ import type { Metrics } from "../metrics.js";[39m
[31m+ import { evaluateMcpPolicy } from "../policy.js";[39m
[31m+ import { toRepoPolicyPath } from "../../adapters/repo-paths.js";[39m
[31m+ import type { ToolDefinition, ToolHandler } from "../context.js";[39m
[31m+[39m
[31m+ const PROJECTION_METRICS: Readonly<Record<string, ((m: Metrics) => void) | undefined>> = {[39m
[31m+   content: (m) => { m.recordRead(); },[39m
[31m+   outline: (m) => { m.recordOutline(); },[39m
[31m+   refused: (m) => { m.recordRefusal(); },[39m
[31m+ };[39m
[31m+[39m
[31m+ const CACHEABLE_PROJECTIONS: ReadonlySet<SafeReadResult["projection"]> = new Set(["content", "outline"]);[39m
[31m+[39m
[31m+ export const safeReadTool: ToolDefinition = {[39m
[31m+   name: "safe_read",[39m
[31m+   description:[39m
[31m+     "Policy-enforced file read. Returns full content for small files, " +[39m
[31m+     "structural outline with jump table for large files, or refusal with " +[39m
[31m+     "reason code for banned files. Detects re-reads and returns cached " +[39m
[31m+     "outlines or structural diffs.",[39m
[31m+   schema: { path: z.string(), intent: z.string().optional() },[39m
[31m+   createHandler(): ToolHandler {[39m
[31m+     return async (args, ctx) => {[39m
[31m+       const filePath = ctx.resolvePath(args["path"] as string);[39m
[31m+       ctx.recordFootprint({ paths: [filePath] });[39m
[31m+[39m
[31m+       // Build CachedFile once — all consumers share the same snapshot,[39m
[31m+       // eliminating TOCTOU races where the file changes between reads.[39m
[31m+       let cf: CachedFile | null = null;[39m
[31m+       try {[39m
[31m+         const rawContent = await ctx.fs.readFile(filePath, "utf-8");[39m
[31m+         cf = new CachedFile(filePath, rawContent);[39m
[31m+       } catch {[39m
[31m+         // File doesn't exist or can't be read — proceed to safeRead for error handling[39m
[31m+       }[39m
[31m+[39m
[31m+       // Check cache if we could read the file[39m
[31m+       if (cf?.supportsOutline === true) {[39m
[31m+         const cacheResult = ctx.cache.check(filePath, cf.rawContent);[39m
[31m+         if (cacheResult.hit) {[39m
[31m+           // Defense: re-check policy before returning cached data.[39m
[31m+           const policy = evaluateMcpPolicy(ctx, filePath, cf.actual);[39m
[31m+           if (policy instanceof RefusedResult) {[39m
[31m+             ctx.metrics.recordRefusal();[39m
[31m+             return ctx.respond("safe_read", {[39m
[31m+               path: filePath,[39m
[31m+               projection: "refused",[39m
[31m+               reason: policy.reason,[39m
[31m+               reasonDetail: policy.reasonDetail,[39m
[31m+               next: [...policy.next],[39m
[31m+               actual: cf.actual,[39m
[31m+             });[39m
[31m+           }[39m
[31m+[39m
[31m+           cacheResult.obs.touch();[39m
[31m+           ctx.metrics.recordCacheHit(cf.actual.bytes);[39m
[31m+           ctx.recordFootprint({[39m
[31m+             symbols: cacheResult.obs.outline.map((e) => e.name),[39m
[31m+           });[39m
[31m+           return ctx.respond("safe_read", {[39m
[31m+             path: filePath,[39m
[31m+             projection: "cache_hit",[39m
[31m+             reason: "REREAD_UNCHANGED",[39m
[31m+             outline: cacheResult.obs.outline,[39m
[31m+             jumpTable: cacheResult.obs.jumpTable,[39m
[31m+             actual: cf.actual,[39m
[31m+             readCount: cacheResult.obs.readCount,[39m
[31m+             estimatedBytesAvoided: cf.actual.bytes,[39m
[31m+             lastReadAt: cacheResult.obs.lastReadAt,[39m
[31m+           });[39m
[31m+         }[39m
[31m+[39m
[31m+         // File changed since last observation — compute structural diff[39m
[31m+         if (cacheResult.stale !== null) {[39m
[31m+           // Defense: re-check policy before returning structural data.[39m
[31m+           const policy = evaluateMcpPolicy(ctx, filePath, cf.actual);[39m
[31m+           if (policy instanceof RefusedResult) {[39m
[31m+             ctx.metrics.recordRefusal();[39m
[31m+             return ctx.respond("safe_read", {[39m
[31m+               path: filePath,[39m
[31m+               projection: "refused",[39m
[31m+               reason: policy.reason,[39m
[31m+               reasonDetail: policy.reasonDetail,[39m
[31m+               next: [...policy.next],[39m
[31m+               actual: cf.actual,[39m
[31m+             });[39m
[31m+           }[39m
[31m+[39m
[31m+           const diff = diffOutlines(cacheResult.stale.outline, cf.outline);[39m
[31m+           const newReadCount = cacheResult.stale.readCount + 1;[39m
[31m+           ctx.cache.record(filePath, cf.hash, cf.outline, cf.jumpTable, cf.actual);[39m
[31m+           ctx.recordFootprint({[39m
[31m+             symbols: cf.outline.map((e) => e.name),[39m
[31m+           });[39m
[31m+           const updatedObs = ctx.cache.get(filePath);[39m
[31m+           return ctx.respond("safe_read", {[39m
[31m+             path: filePath,[39m
[31m+             projection: "diff",[39m
[31m+             reason: "CHANGED_SINCE_LAST_READ",[39m
[31m+             diff,[39m
[31m+             outline: cf.outline,[39m
[31m+             jumpTable: cf.jumpTable,[39m
[31m+             actual: cf.actual,[39m
[31m+             readCount: newReadCount,[39m
[31m+             lastReadAt: updatedObs?.lastReadAt ?? new Date().toISOString(),[39m
[31m+           });[39m
[31m+         }[39m
[31m+       }[39m
[31m+[39m
[31m+       // First read — pass rawContent to avoid double-read (TOCTOU)[39m
[31m+       const result = await safeRead(filePath, {[39m
[31m+         fs: ctx.fs,[39m
[31m+         codec: ctx.codec,[39m
[31m+         content: cf?.rawContent,[39m
[31m+         intent: args["intent"] as string | undefined,[39m
[31m+         policyPath: toRepoPolicyPath(ctx.projectRoot, filePath),[39m
[31m+         graftignorePatterns: [...ctx.graftignorePatterns],[39m
[31m+         sessionDepth: ctx.governor.getGovernorDepth(),[39m
[31m+         budgetRemaining: ctx.governor.getBudget()?.remaining,[39m
[31m+       });[39m
[31m+[39m
[31m+       PROJECTION_METRICS[result.projection]?.(ctx.metrics);[39m
[31m+       if (result.outline !== undefined) {[39m
[31m+         ctx.recordFootprint({ symbols: result.outline.map((e) => e.name) });[39m
[31m+       }[39m
[31m+[39m
[31m+       // Record observation for cacheable projections — uses CachedFile[39m
[31m+       // outline (no re-read) to eliminate the snapshot race.[39m
[31m+       if ([39m
[31m+         cf !== null &&[39m
[31m+         cf.supportsOutline &&[39m
[31m+         result.actual !== undefined &&[39m
[31m+         CACHEABLE_PROJECTIONS.has(result.projection) &&[39m
[31m+         result.reason !== "UNSUPPORTED_LANGUAGE"[39m
[31m+       ) {[39m
[31m+         ctx.cache.record(filePath, cf.hash, cf.outline, cf.jumpTable, result.actual);[39m
[31m+       }[39m
[31m+[39m
[31m+       return ctx.respond("safe_read", toJsonObject(result));[39m
[31m+     };[39m
[31m+   },[39m
[31m+ };[39m
[31m+[39m

[36m [2m❯[22m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts:[2m82:23[22m[39m
    [90m 80|[39m     [35mfor[39m ([35mconst[39m filePath [35mof[39m [33mREAD_TOOL_FILES[39m) {
    [90m 81|[39m       [35mconst[39m content [33m=[39m [34mread[39m(filePath)[33m;[39m
    [90m 82|[39m       [34mexpect[39m(content)[33m.[39m[34mtoContain[39m([32m"createRepoWorkspaceFromToolContext"[39m)[33m;[39m
    [90m   |[39m                       [31m^[39m
    [90m 83|[39m       [34mexpect[39m(content)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m"new RepoWorkspace("[39m)[33m;[39m
    [90m 84|[39m     }

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0080-warp-port-and-adapter-boundary.test.ts[2m > [22m0080 warp port and adapter boundary[2m > [22mDo MCP and CLI surfaces use the port type for pooling, context, precision reads, and local-history graph access?
[31m[1mAssertionError[22m: expected 'export { PrecisionSearchRequest } fro…' to contain 'type { WarpHandle }'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- type { WarpHandle }[39m
[31m+ export { PrecisionSearchRequest } from "./precision-query.js";[39m
[31m+ export { PrecisionSymbolMatch } from "./precision-match.js";[39m
[31m+ export type { PrecisionPolicyRefusal } from "./precision-live.js";[39m
[31m+ export {[39m
[31m+   collectSymbols,[39m
[31m+   loadFileContent,[39m
[31m+   evaluatePrecisionPolicy,[39m
[31m+   searchLiveSymbols,[39m
[31m+   readRangeFromContent,[39m
[31m+ } from "./precision-live.js";[39m
[31m+ export {[39m
[31m+   normalizeRepoPath,[39m
[31m+   requireRepoPath,[39m
[31m+   resolveGitRef,[39m
[31m+   listTrackedFilesAtRef,[39m
[31m+   isWorkingTreeDirty,[39m
[31m+ } from "./precision-paths.js";[39m
[31m+ export {[39m
[31m+   getIndexedCommitCeilings,[39m
[31m+   searchWarpSymbols,[39m
[31m+ } from "./precision-warp.js";[39m
[31m+[39m

[36m [2m❯[22m tests/playback/0080-warp-port-and-adapter-boundary.test.ts:[2m75:23[22m[39m
    [90m 73|[39m     [34mexpect[39m(pool)[33m.[39m[34mtoContain[39m([32m"Promise<WarpHandle>"[39m)[33m;[39m
    [90m 74|[39m     [34mexpect[39m(router)[33m.[39m[34mtoContain[39m([32m"getWarp(): Promise<WarpHandle>"[39m)[33m;[39m
    [90m 75|[39m     [34mexpect[39m(precision)[33m.[39m[34mtoContain[39m([32m"type { WarpHandle }"[39m)[33m;[39m
    [90m   |[39m                       [31m^[39m
    [90m 76|[39m     [34mexpect[39m(precision)[33m.[39m[34mtoContain[39m([32m"warp.materializeReceipts()"[39m)[33m;[39m
    [90m 77|[39m     [34mexpect[39m(migrate)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m"asPersistedLocalHistoryGraphWarp"[39m)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/method/0069-graft-map-bounded-overview.test.ts[2m > [22m0069 graft_map bounded overview playback[2m > [22mgraft_map depth 0 returns direct files and summarized child directories for one-call orientation
[31m[1mZodError[22m: [
  {
    "code": "unrecognized_keys",
    "keys": [
      "depth"
    ],
    "path": [],
    "message": "Unrecognized key: \"depth\""
  }
][39m
[36m [2m❯[22m Object.invokeTool src/mcp/server-invocation.ts:[2m226:64[22m[39m
    [90m224|[39m
    [90m225|[39m     [35mtry[39m {
    [90m226|[39m       const parsed: JsonObject = schema !== undefined ? schema.parse(a…
    [90m   |[39m                                                                [31m^[39m
    [90m227|[39m       [34menforceDaemonToolAccess[39m({
    [90m228|[39m         mode[33m,[39m
[90m [2m❯[22m expectGraftMapDepthOverviewPlayback test/helpers/graft-map-playback.ts:[2m18:26[22m[39m
[90m [2m❯[22m tests/method/0069-graft-map-bounded-overview.test.ts:[2m9:5[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/25]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/method/0069-graft-map-bounded-overview.test.ts[2m > [22m0069 graft_map bounded overview playback[2m > [22mgraft_map summary mode reports symbol counts without emitting per-symbol payloads
[31m[1mZodError[22m: [
  {
    "code": "unrecognized_keys",
    "keys": [
      "summary"
    ],
    "path": [],
    "message": "Unrecognized key: \"summary\""
  }
][39m
[36m [2m❯[22m Object.invokeTool src/mcp/server-invocation.ts:[2m226:64[22m[39m
    [90m224|[39m
    [90m225|[39m     [35mtry[39m {
    [90m226|[39m       const parsed: JsonObject = schema !== undefined ? schema.parse(a…
    [90m   |[39m                                                                [31m^[39m
    [90m227|[39m       [34menforceDaemonToolAccess[39m({
    [90m228|[39m         mode[33m,[39m
[90m [2m❯[22m expectGraftMapSummaryPlayback test/helpers/graft-map-playback.ts:[2m61:26[22m[39m
[90m [2m❯[22m tests/method/0069-graft-map-bounded-overview.test.ts:[2m13:5[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/integration/mcp/daemon-bridge.test.ts[2m > [22mintegration: daemon-backed MCP bridge over stdio[2m > [22mproxies daemon-only workspace binding flow through stdio
[31m[1mSyntaxError[22m: Unexpected token 'M', "MCP error "... is not valid JSON[39m
[36m [2m❯[22m test/integration/mcp/daemon-bridge.test.ts:[2m56:34[22m[39m
    [90m 54|[39m
    [90m 55|[39m   it("proxies daemon-only workspace binding flow through stdio", async…
    [90m 56|[39m     const workspaceStatus = JSON.parse(extractText(await client.callTo…
    [90m   |[39m                                  [31m^[39m
    [90m 57|[39m       name[33m:[39m [32m"workspace_status"[39m[33m,[39m
    [90m 58|[39m       arguments[33m:[39m {}[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/contracts/output-schemas.test.ts[2m > [22mcontracts: output schemas[2m > [22mvalidates representative MCP tool outputs against the declared schemas
[31m[1mAssertionError[22m: expected [Function] to not throw an error but '[\n  {\n    "expected": "number",\n  …' was thrown[39m

[32m- Expected:[39m
undefined

[31m+ Received:[39m
"[
  {
    \"expected\": \"number\",
    \"code\": \"invalid_type\",
    \"path\": [
      \"files\",
      0,
      \"symbolCount\"
    ],
    \"message\": \"Invalid input: expected number, received undefined\"
  },
  {
    \"expected\": \"boolean\",
    \"code\": \"invalid_type\",
    \"path\": [
      \"files\",
      0,
      \"summaryOnly\"
    ],
    \"message\": \"Invalid input: expected boolean, received undefined\"
  },
  {
    \"expected\": \"object\",
    \"code\": \"invalid_type\",
    \"path\": [
      \"mode\"
    ],
    \"message\": \"Invalid input: expected object, received undefined\"
  }
]"

[36m [2m❯[22m test/unit/contracts/output-schemas.test.ts:[2m207:71[22m[39m
    [90m205|[39m
    [90m206|[39m     [35mfor[39m ([35mconst[39m tool [35mof[39m [33mMCP_TOOL_NAMES[39m) {
    [90m207|[39m       expect(() => MCP_OUTPUT_SCHEMAS[tool].parse(outputs[tool])).not.…
    [90m   |[39m                                                                       [31m^[39m
    [90m208|[39m     }
    [90m209|[39m   })[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/contracts/output-schemas.test.ts[2m > [22mcontracts: output schemas[2m > [22mvalidates representative CLI peer outputs against the declared schemas
[31m[1mAssertionError[22m: expected 'Error: [\n  {\n    "expected": "numbe…' to be '' // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[31m+ Error: [[39m
[31m+   {[39m
[31m+     "expected": "number",[39m
[31m+     "code": "invalid_type",[39m
[31m+     "path": [[39m
[31m+       "files",[39m
[31m+       0,[39m
[31m+       "symbolCount"[39m
[31m+     ],[39m
[31m+     "message": "Invalid input: expected number, received undefined"[39m
[31m+   },[39m
[31m+   {[39m
[31m+     "expected": "boolean",[39m
[31m+     "code": "invalid_type",[39m
[31m+     "path": [[39m
[31m+       "files",[39m
[31m+       0,[39m
[31m+       "summaryOnly"[39m
[31m+     ],[39m
[31m+     "message": "Invalid input: expected boolean, received undefined"[39m
[31m+   },[39m
[31m+   {[39m
[31m+     "expected": "object",[39m
[31m+     "code": "invalid_type",[39m
[31m+     "path": [[39m
[31m+       "mode"[39m
[31m+     ],[39m
[31m+     "message": "Invalid input: expected object, received undefined"[39m
[31m+   }[39m
[31m+ ][39m
[31m+[39m
[31m+ Usage: graft struct map [<directory>] [--json][39m
[31m+[39m
[31m+ See docs/CLI.md for grouped command help.[39m
[31m+[39m

[36m [2m❯[22m runCliJson test/unit/contracts/output-schemas.test.ts:[2m52:25[22m[39m
    [90m 50|[39m   [35mconst[39m stderr [33m=[39m [34mcreateBufferWriter[39m()[33m;[39m
    [90m 51|[39m   [35mawait[39m [34mrunCli[39m({ cwd[33m,[39m args[33m,[39m stdout[33m,[39m stderr })[33m;[39m
    [90m 52|[39m   [34mexpect[39m(stderr[33m.[39m[34mtext[39m())[33m.[39m[34mtoBe[39m([32m""[39m)[33m;[39m
    [90m   |[39m                         [31m^[39m
    [90m 53|[39m   [35mreturn[39m [33mJSON[39m[33m.[39m[34mparse[39m(stdout[33m.[39m[34mtext[39m()) [35mas[39m [33mRecord[39m[33m<[39mstring[33m,[39m unknown[33m>[39m[33m;[39m
    [90m 54|[39m }
[90m [2m❯[22m test/unit/contracts/output-schemas.test.ts:[2m299:19[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/precision.test.ts[2m > [22mmcp: code_show[2m > [22muses WARP for indexed historical reads
[31m[1mTypeError[22m: .toMatch() expects to receive a string, but got undefined[39m
[36m [2m❯[22m test/unit/mcp/precision.test.ts:[2m110:36[22m[39m
    [90m108|[39m
    [90m109|[39m       [34mexpect[39m(result[[32m"source"[39m])[33m.[39m[34mtoBe[39m([32m"warp"[39m)[33m;[39m
    [90m110|[39m       [34mexpect[39m(result[[32m"identityId"[39m])[33m.[39m[34mtoMatch[39m([36m/^sid:[a-f0-9]{16}$/[39m)[33m;[39m
    [90m   |[39m                                    [31m^[39m
    [90m111|[39m       [34mexpect[39m(result[[32m"content"[39m])[33m.[39m[34mtoContain[39m([32m'return "v1";'[39m)[33m;[39m
    [90m112|[39m       [34mexpect[39m(result[[32m"content"[39m])[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'return "v2";'[39m)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/project-root-resolution.test.ts[2m > [22mproject root resolution[2m > [22muses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/mcp/project-root-resolution.test.ts:[2m39:3[22m[39m
    [90m 37|[39m   })[33m;[39m
    [90m 38|[39m
    [90m 39|[39m   it("uses GRAFT_PROJECT_ROOT env var when projectRoot option is not p…
    [90m   |[39m   [31m^[39m
    [90m 40|[39m     [35mconst[39m envRoot [33m=[39m [34mmakeTmpDir[39m()[33m;[39m
    [90m 41|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/project-root-resolution.test.ts[2m > [22mproject root resolution[2m > [22mfalls back gracefully when neither projectRoot nor env var is set
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/mcp/project-root-resolution.test.ts:[2m51:3[22m[39m
    [90m 49|[39m   })[33m;[39m
    [90m 50|[39m
    [90m 51|[39m   it("falls back gracefully when neither projectRoot nor env var is se…
    [90m   |[39m   [31m^[39m
    [90m 52|[39m     [35mconst[39m tmpDir [33m=[39m [34mmakeTmpDir[39m()[33m;[39m
    [90m 53|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/runtime-observability.test.ts[2m > [22mmcp: runtime observability[2m > [22mexposes runtime observability status in doctor
[31m[1mAssertionError[22m: expected '/private/var/folders/1h/qn5740kx131g0…' to be '/var/folders/1h/qn5740kx131g0sxvgv12v…' // Object.is equality[39m

Expected: [32m"/var/folders/1h/qn5740kx131g0sxvgv12vm_m0000gn/T/graft-mcp-project-da0CZL/hooks"[39m
Received: [31m"[7m/private[27m/var/folders/1h/qn5740kx131g0sxvgv12vm_m0000gn/T/graft-mcp-project-da0CZL/[7m.git/[27mhooks"[39m

[36m [2m❯[22m test/unit/mcp/runtime-observability.test.ts:[2m289:71[22m[39m
    [90m287|[39m       expect(workspaceOverlayFooting.hookBootstrap.posture).toBe("abse…
    [90m288|[39m       expect(workspaceOverlayFooting.hookBootstrap.configuredCoreHooks…
    [90m289|[39m       expect(workspaceOverlayFooting.hookBootstrap.resolvedHooksPath).…
    [90m   |[39m                                                                       [31m^[39m
    [90m290|[39m         path[33m.[39m[34mjoin[39m(isolated[33m.[39mprojectRoot[33m,[39m [32m"hooks"[39m)[33m,[39m
    [90m291|[39m       )[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/structural-policy.test.ts[2m > [22mmcp: structural tool policy enforcement[2m > [22mgraft_map depth 0 returns direct files and summarized child directories for one-call orientation
[31m[1mZodError[22m: [
  {
    "code": "unrecognized_keys",
    "keys": [
      "depth"
    ],
    "path": [],
    "message": "Unrecognized key: \"depth\""
  }
][39m
[36m [2m❯[22m Object.invokeTool src/mcp/server-invocation.ts:[2m226:64[22m[39m
    [90m224|[39m
    [90m225|[39m     [35mtry[39m {
    [90m226|[39m       const parsed: JsonObject = schema !== undefined ? schema.parse(a…
    [90m   |[39m                                                                [31m^[39m
    [90m227|[39m       [34menforceDaemonToolAccess[39m({
    [90m228|[39m         mode[33m,[39m
[90m [2m❯[22m expectGraftMapDepthOverviewPlayback test/helpers/graft-map-playback.ts:[2m18:26[22m[39m
[90m [2m❯[22m test/unit/mcp/structural-policy.test.ts:[2m63:20[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/25]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/structural-policy.test.ts[2m > [22mmcp: structural tool policy enforcement[2m > [22mgraft_map summary mode reports symbol counts without emitting per-symbol payloads
[31m[1mZodError[22m: [
  {
    "code": "unrecognized_keys",
    "keys": [
      "summary"
    ],
    "path": [],
    "message": "Unrecognized key: \"summary\""
  }
][39m
[36m [2m❯[22m Object.invokeTool src/mcp/server-invocation.ts:[2m226:64[22m[39m
    [90m224|[39m
    [90m225|[39m     [35mtry[39m {
    [90m226|[39m       const parsed: JsonObject = schema !== undefined ? schema.parse(a…
    [90m   |[39m                                                                [31m^[39m
    [90m227|[39m       [34menforceDaemonToolAccess[39m({
    [90m228|[39m         mode[33m,[39m
[90m [2m❯[22m expectGraftMapSummaryPlayback test/helpers/graft-map-playback.ts:[2m61:26[22m[39m
[90m [2m❯[22m test/unit/mcp/structural-policy.test.ts:[2m68:20[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/25]⎯[22m[39m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 14 playback questions, 189 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [ ] Test command failed: `npm test`.
- [x] Drift check passed: `method drift CORE_v060-bad-code-burndown`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_v060-bad-code-burndown
```

Expected: the recorded test command currently fails; inspect the captured output before closing the cycle.
Expected: the recorded drift command exits 0.
