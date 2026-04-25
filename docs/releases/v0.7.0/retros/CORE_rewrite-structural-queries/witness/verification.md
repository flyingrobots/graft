---
title: "Verification Witness for Cycle CORE_rewrite-structural-queries"
---

# Verification Witness for Cycle CORE_rewrite-structural-queries

This witness proves that `Rewrite structural-queries to use WARP native operations` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.6.1 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m16 tests[22m[2m)[22m[33m 12568[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 470[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 502[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2801[2mms[22m[39m
     [33m[2m✓[22m[39m preserves canonical identity across a same-file rename when indexing incrementally [33m 1704[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 728[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 754[2mms[22m[39m
     [33m[2m✓[22m[39m preserves canonical identity across a git-reported file rename [33m 987[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 437[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 408[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 665[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 412[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 803[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 1123[2mms[22m[39m
     [33m[2m✓[22m[39m disambiguates same-named methods across different classes [33m 401[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13706[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 2479[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 2110[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 860[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 840[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 791[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1063[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 687[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 474[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 661[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 846[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 685[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 546[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 880[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 783[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 14388[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 1485[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 2225[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 1048[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 476[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 523[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 630[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 833[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 846[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 927[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 544[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 469[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 776[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 455[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 764[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 566[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 486[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 550[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 630[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15092[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 2417[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 1272[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 942[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 905[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 753[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 887[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 776[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 1067[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 1295[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 998[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 1323[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 835[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 761[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 857[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 15129[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 1308[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 2854[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 996[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1066[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 810[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 878[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 775[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 787[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 772[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 1089[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 770[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 563[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 811[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 796[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 853[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 15275[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1359[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 2266[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1149[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 1614[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 761[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 599[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 628[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 607[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 603[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 619[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 622[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 905[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 884[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1001[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 716[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 20387[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 4454[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 808[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 966[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 606[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 1206[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 581[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 738[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 654[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1072[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 836[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1147[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1167[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 1901[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 4247[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 23346[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 1585[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 2057[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 1055[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 481[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 505[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 601[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 576[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 575[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 456[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 477[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 471[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 462[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 832[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 1106[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 476[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 700[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 451[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 689[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 815[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 949[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 1217[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 633[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 847[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 390[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 467[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 572[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 393[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 1932[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 804[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 9153[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 3122[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 2352[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 3477[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 7877[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 2605[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1651[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1750[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1870[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 7405[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 1447[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 936[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 680[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 831[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1107[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 806[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-churn.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8973[2mms[22m[39m
     [33m[2m✓[22m[39m counts changes for a function modified across multiple commits [33m 3004[2mms[22m[39m
     [33m[2m✓[22m[39m ranks symbols by change frequency [33m 2046[2mms[22m[39m
     [33m[2m✓[22m[39m respects the limit parameter [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m directory path filter matches symbols within directory [33m 1084[2mms[22m[39m
     [33m[2m✓[22m[39m exact file path filter still works [33m 1193[2mms[22m[39m
     [33m[2m✓[22m[39m directory filter with trailing slash works [33m 1122[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-log.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 8364[2mms[22m[39m
     [33m[2m✓[22m[39m returns entries with commit metadata and symbol changes [33m 1364[2mms[22m[39m
     [33m[2m✓[22m[39m shows changes across multiple commits [33m 1993[2mms[22m[39m
     [33m[2m✓[22m[39m respects limit option [33m 2089[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path [33m 574[2mms[22m[39m
     [33m[2m✓[22m[39m uses since option to filter commit range [33m 1307[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array for no commits in range [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m builds human-readable summary strings [33m 536[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 11273[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 922[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1074[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1422[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 2233[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 4062[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1560[2mms[22m[39m
 [32m✓[39m tests/playback/0091-canonical-symbol-identity-across-files-and-commits.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6927[2mms[22m[39m
     [33m[2m✓[22m[39m Does an indexed symbol keep the same canonical sid identity when a function is renamed in place across commits? [33m 1313[2mms[22m[39m
     [33m[2m✓[22m[39m Does a git-reported file move preserve the same canonical sid identity and expose it through indexed precision reads? [33m 2107[2mms[22m[39m
     [33m[2m✓[22m[39m Does the WARP indexer seed identity from prior graph truth through observers instead of mining materialization receipts? [33m 1546[2mms[22m[39m
     [33m[2m✓[22m[39m Do indexed precision surfaces expose canonical identity without pretending live parse or address keys are themselves stable identity? [33m 1957[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 4836[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 360[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 495[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 639[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 564[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 425[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 360[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 534[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single modified FileDiff at new path [33m 336[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with symbol changes shows accurate diff [33m 367[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-review.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 5476[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes structural vs formatting files [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes test, docs, and config files [33m 712[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: removed export [33m 798[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: changed signature [33m 487[2mms[22m[39m
     [33m[2m✓[22m[39m renders a human-readable summary [33m 644[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag removal of non-exported symbol as breaking [33m 332[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag signature change of non-exported symbol as breaking [33m 553[2mms[22m[39m
     [33m[2m✓[22m[39m flags only exported removals in mixed exported/non-exported changes [33m 382[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file produces ZERO breaking changes [33m 339[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with actual symbol removal flags only the real removal [33m 388[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single entry, not delete + add pair [33m 340[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5422[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 1121[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 422[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 389[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 436[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 352[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 5574[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1231[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1117[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 306[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 1770[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1146[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 5280[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1258[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 909[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 897[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 647[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 908[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 6933[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1328[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 558[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1078[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 1738[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 505[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1058[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 406[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6854[2mms[22m[39m
     [33m[2m✓[22m[39m shares daemon-wide workspace authorization and bound session state across sessions on the same repo [33m 3039[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 1737[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 2078[2mms[22m[39m
 [32m✓[39m test/unit/mcp/map-truncation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 4942[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when file count exceeds MAX_MAP_FILES [33m 1379[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when response bytes exceed MAX_MAP_BYTES [33m 1535[2mms[22m[39m
     [33m[2m✓[22m[39m returns summary-only with BUDGET_EXHAUSTED when session budget is drained [33m 1362[2mms[22m[39m
     [33m[2m✓[22m[39m does not truncate when within limits [33m 664[2mms[22m[39m
 [32m✓[39m test/unit/warp/ast-import-resolver.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5055[2mms[22m[39m
     [33m[2m✓[22m[39m named import: references sym node in target file [33m 619[2mms[22m[39m
     [33m[2m✓[22m[39m aliased import: import { foo as baz } references foo [33m 864[2mms[22m[39m
     [33m[2m✓[22m[39m default import: import foo from './bar' references default [33m 840[2mms[22m[39m
     [33m[2m✓[22m[39m namespace import: import * as ns references the file [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m re-export: export { foo } from './bar' references sym [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m wildcard re-export: export * from './bar' reexports file [33m 413[2mms[22m[39m
     [33m[2m✓[22m[39m resolves_to edge: module path resolves to file node [33m 416[2mms[22m[39m
     [33m[2m✓[22m[39m non-relative import: no resolves_to edge, but AST still emitted [33m 356[2mms[22m[39m
     [33m[2m✓[22m[39m dynamic import: import('./foo') resolves to file [33m 439[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-blame.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3887[2mms[22m[39m
     [33m[2m✓[22m[39m returns creation commit for a newly added function [33m 935[2mms[22m[39m
     [33m[2m✓[22m[39m detects last signature change across commits [33m 1338[2mms[22m[39m
     [33m[2m✓[22m[39m returns reference count for a symbol [33m 577[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty result for unknown symbol [33m 471[2mms[22m[39m
     [33m[2m✓[22m[39m filters by file path when provided [33m 564[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 2769[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1367[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1175[2mms[22m[39m
 [32m✓[39m test/unit/warp/structural-queries.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 5174[2mms[22m[39m
       [33m[2m✓[22m[39m returns added symbols for a commit that adds functions [33m 1009[2mms[22m[39m
       [33m[2m✓[22m[39m returns changed symbols when a function signature is modified [33m 1710[2mms[22m[39m
       [33m[2m✓[22m[39m returns removed symbols when a function is deleted [33m 1158[2mms[22m[39m
       [33m[2m✓[22m[39m returns commits that touched a symbol in order [33m 815[2mms[22m[39m
       [33m[2m✓[22m[39m filters by filePath when provided [33m 480[2mms[22m[39m
 [32m✓[39m tests/playback/0088-target-repo-git-hook-bootstrap.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 2936[2mms[22m[39m
     [33m[2m✓[22m[39m writes target-repo git transition hooks with an explicit flag [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 903[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 847[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 4729[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 414[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 557[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 447[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 306[2mms[22m[39m
     [33m[2m✓[22m[39m handles multiple renames in same commit [33m 323[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 4430[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 1960[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1236[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1232[2mms[22m[39m
 [32m✓[39m test/unit/operations/export-surface-diff.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 3651[2mms[22m[39m
     [33m[2m✓[22m[39m detects added exported function as minor semver impact [33m 407[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed exported function as major semver impact [33m 390[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed exported signature [33m 606[2mms[22m[39m
     [33m[2m✓[22m[39m ignores non-exported symbols [33m 1017[2mms[22m[39m
     [33m[2m✓[22m[39m new file (not at base) produces added exports without throwing [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m deleted file (not at head) produces removed exports without throwing [33m 440[2mms[22m[39m
 [32m✓[39m test/unit/warp/index-head.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 3157[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a multi-file repo and resolves import references [33m 886[2mms[22m[39m
     [33m[2m✓[22m[39m handles aliased imports correctly [33m 1157[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-parseable files gracefully [33m 458[2mms[22m[39m
     [33m[2m✓[22m[39m emits file nodes for all parsed files [33m 653[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-bridge.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 3088[2mms[22m[39m
     [33m[2m✓[22m[39m proxies daemon-only workspace binding flow through stdio [33m 1361[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4416[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 618[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 855[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 1354[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 778[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 810[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 4030[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2920[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1108[2mms[22m[39m
 [32m✓[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3229[2mms[22m[39m
     [33m[2m✓[22m[39m Can an external app create a repo-local workspace and call direct governed read methods without going through MCP receipts? [33m 367[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 2857[2mms[22m[39m
 [32m✓[39m test/unit/warp/references-for-symbol.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 4179[2mms[22m[39m
     [33m[2m✓[22m[39m finds files that import a named symbol [33m 520[2mms[22m[39m
     [33m[2m✓[22m[39m finds aliased imports [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m finds multiple referencing files [33m 948[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty for unreferenced symbol [33m 594[2mms[22m[39m
     [33m[2m✓[22m[39m finds namespace imports that reference the file [33m 615[2mms[22m[39m
     [33m[2m✓[22m[39m finds re-exports [33m 431[2mms[22m[39m
 [32m✓[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 4313[2mms[22m[39m
     [33m[2m✓[22m[39m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries? [33m 3815[2mms[22m[39m
 [32m✓[39m test/unit/warp/reference-count.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 860[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 663[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 617[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 1687[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 554[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 511[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 617[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1303[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1270[2mms[22m[39m
 [32m✓[39m test/unit/mcp/project-root-resolution.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 841[2mms[22m[39m
     [33m[2m✓[22m[39m uses explicit projectRoot over GRAFT_PROJECT_ROOT env var [33m 396[2mms[22m[39m
     [33m[2m✓[22m[39m uses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided [33m 438[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 918[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1137[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 1126[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1761[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 819[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 941[2mms[22m[39m
 [32m✓[39m test/unit/mcp/worktree-identity-canonicalization.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 495[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 183[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 89[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 391[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 433[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 119[2mms[22m[39m
 [32m✓[39m test/unit/adapters/rotating-ndjson-log.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 162[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 636[2mms[22m[39m
 [32m✓[39m test/unit/warp/full-ast.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 430[2mms[22m[39m
     [33m[2m✓[22m[39m emits every tree-sitter node for a TypeScript file into the graph [33m 429[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 122[2mms[22m[39m
 [32m✓[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-bad-code-burndown.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 49[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/mcp/path-resolver.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m tests/playback/0089-logical-warp-writer-lanes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-stdio-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/ports/filesystem-contract.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v070-structural-history.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m tests/playback/0092-daemon-session-directory-cleanup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-code-review-fixes.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/warp/context.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/ports/guards.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt-builder.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/adapters/repo-paths-invariants.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0090-symbol-identity-and-rename-continuity.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tool-call-footprint.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/secret-scrub.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/metrics/metrics.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/ports/codec-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/diff-identity.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-paths.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/context-guard.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0093-structural-queries-use-query-builder.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/package-files-exist.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/warp-plumbing-conformance.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/cli/index-cmd.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 44549[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 10052[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 353[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 33830[2mms[22m[39m

[2m Test Files [22m [1m[32m142 passed[39m[22m[90m (142)[39m
[2m      Tests [22m [1m[32m1192 passed[39m[22m[90m (1192)[39m
[2m   Start at [22m 04:29:04
[2m   Duration [22m 45.91s[2m (transform 5.92s, setup 0ms, import 34.95s, tests 351.91s, environment 14ms)[22m


```

## Drift Results

```text
Playback-question drift found.
Scanned 1 active cycle, 5 playback questions, 215 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

docs/releases/v0.7.0/design/CORE_rewrite-structural-queries.md
- Human: Can a human confirm the public API surface is unchanged (same exports, same types, same behavior)?
  No matching test description found.
- Human: Can a human see that manual edge-filter loops have been replaced with QueryBuilder calls?
  No matching test description found.
- Agent: Do all existing structural-queries tests pass without changes?
  No matching test description found.
- Agent: Do all downstream consumers (structural-log, structural-blame, structural-churn) still pass?
  No matching test description found.
- Agent: Does `pnpm lint` pass with zero warnings?
  No matching test description found.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [ ] Drift check reported playback-question drift: `method drift CORE_rewrite-structural-queries`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_rewrite-structural-queries
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command currently reports playback-question drift.
