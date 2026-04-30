---
title: "Verification Witness for Cycle CORE_deprecate-index-commits"
---

# Verification Witness for Cycle CORE_deprecate-index-commits

This witness proves that `Remove legacy commit-walking indexer` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.6.1 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 11911[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 2321[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 2377[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1274[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1221[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 3463[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1254[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15116[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 2086[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 2365[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 985[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 1031[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 881[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1174[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 755[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 466[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 691[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 986[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 733[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 598[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 1237[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 1126[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 15726[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 1416[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 2005[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 1230[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 743[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 662[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 905[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 908[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 976[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 591[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 462[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 844[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 467[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 831[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 842[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 580[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 823[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 754[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 16571[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 1185[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 2734[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 1154[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1346[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 885[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 881[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 906[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 821[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 817[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 1197[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 828[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 847[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 1091[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 1049[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 828[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 16684[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 2399[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 1324[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 917[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 1140[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 860[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 950[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 881[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 1131[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 1386[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 1061[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 1629[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 1152[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 912[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 930[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 16731[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1445[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 2084[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1270[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 1834[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 842[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 683[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 639[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 642[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 646[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 640[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1172[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1216[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1162[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 827[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 21703[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 4233[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 969[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1189[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 663[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 1242[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 705[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 725[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 733[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1129[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 875[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1516[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1584[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 1667[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 4470[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 9384[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 2258[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 1972[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 5069[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 7390[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 2552[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1928[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1802[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1107[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-churn.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7543[2mms[22m[39m
     [33m[2m✓[22m[39m counts changes for a function modified across multiple commits [33m 1831[2mms[22m[39m
     [33m[2m✓[22m[39m ranks symbols by change frequency [33m 1830[2mms[22m[39m
     [33m[2m✓[22m[39m respects the limit parameter [33m 595[2mms[22m[39m
     [33m[2m✓[22m[39m directory path filter matches symbols within directory [33m 1108[2mms[22m[39m
     [33m[2m✓[22m[39m exact file path filter still works [33m 921[2mms[22m[39m
     [33m[2m✓[22m[39m directory filter with trailing slash works [33m 1256[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 8146[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 816[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 1156[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1218[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 950[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 958[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 887[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 1084[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 7492[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1539[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1164[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 1901[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 590[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1043[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 7196[2mms[22m[39m
     [33m[2m✓[22m[39m shares daemon-wide workspace authorization and bound session state across sessions on the same repo [33m 3510[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 1898[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 1787[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 25226[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 1572[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 1964[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 1070[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 535[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 716[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 633[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 641[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 655[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 509[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 462[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 498[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 489[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 1130[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 602[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 999[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 680[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 853[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 826[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 720[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 500[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 922[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 1200[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 472[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 588[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 593[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 604[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 2244[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 842[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-log.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 5978[2mms[22m[39m
     [33m[2m✓[22m[39m returns entries with commit metadata and symbol changes [33m 487[2mms[22m[39m
     [33m[2m✓[22m[39m shows changes across multiple commits [33m 1041[2mms[22m[39m
     [33m[2m✓[22m[39m respects limit option [33m 1828[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path [33m 883[2mms[22m[39m
     [33m[2m✓[22m[39m uses since option to filter commit range [33m 954[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array for no commits in range [33m 404[2mms[22m[39m
     [33m[2m✓[22m[39m builds human-readable summary strings [33m 381[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 5872[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 798[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1097[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 368[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 2266[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1335[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-review.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 5745[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes structural vs formatting files [33m 714[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes test, docs, and config files [33m 555[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: removed export [33m 420[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: changed signature [33m 560[2mms[22m[39m
     [33m[2m✓[22m[39m renders a human-readable summary [33m 748[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag removal of non-exported symbol as breaking [33m 333[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag signature change of non-exported symbol as breaking [33m 383[2mms[22m[39m
     [33m[2m✓[22m[39m flags only exported removals in mixed exported/non-exported changes [33m 438[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file produces ZERO breaking changes [33m 447[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with actual symbol removal flags only the real removal [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single entry, not delete + add pair [33m 563[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 5025[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 365[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 334[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 449[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 305[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 554[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 361[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single modified FileDiff at new path [33m 406[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with symbol changes shows accurate diff [33m 605[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 4997[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 649[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 392[2mms[22m[39m
     [33m[2m✓[22m[39m returns modified status for modified files [33m 370[2mms[22m[39m
     [33m[2m✓[22m[39m returns added status for new files [33m 337[2mms[22m[39m
     [33m[2m✓[22m[39m detects rename with content changes [33m 448[2mms[22m[39m
     [33m[2m✓[22m[39m handles multiple renames in same commit [33m 534[2mms[22m[39m
 [32m✓[39m test/unit/warp/ast-import-resolver.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5835[2mms[22m[39m
     [33m[2m✓[22m[39m named import: references sym node in target file [33m 1017[2mms[22m[39m
     [33m[2m✓[22m[39m aliased import: import { foo as baz } references foo [33m 648[2mms[22m[39m
     [33m[2m✓[22m[39m default import: import foo from './bar' references default [33m 493[2mms[22m[39m
     [33m[2m✓[22m[39m namespace import: import * as ns references the file [33m 433[2mms[22m[39m
     [33m[2m✓[22m[39m re-export: export { foo } from './bar' references sym [33m 725[2mms[22m[39m
     [33m[2m✓[22m[39m wildcard re-export: export * from './bar' reexports file [33m 675[2mms[22m[39m
     [33m[2m✓[22m[39m resolves_to edge: module path resolves to file node [33m 690[2mms[22m[39m
     [33m[2m✓[22m[39m non-relative import: no resolves_to edge, but AST still emitted [33m 514[2mms[22m[39m
     [33m[2m✓[22m[39m dynamic import: import('./foo') resolves to file [33m 637[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 6412[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 1140[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read refuses binary files [33m 404[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 652[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 518[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 578[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 477[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 6568[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1332[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 754[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 978[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 1040[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 1049[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 1410[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 5361[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 1780[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2004[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1575[2mms[22m[39m
 [32m✓[39m test/unit/warp/structural-queries.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4996[2mms[22m[39m
       [33m[2m✓[22m[39m returns added symbols for a commit that adds functions [33m 646[2mms[22m[39m
       [33m[2m✓[22m[39m returns changed symbols when a function signature is modified [33m 1027[2mms[22m[39m
       [33m[2m✓[22m[39m returns removed symbols when a function is deleted [33m 1932[2mms[22m[39m
       [33m[2m✓[22m[39m returns commits that touched a symbol in order [33m 817[2mms[22m[39m
       [33m[2m✓[22m[39m filters by filePath when provided [33m 573[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 4161[2mms[22m[39m
     [33m[2m✓[22m[39m Is `GitClient` async and backed by `@git-stunts/plumbing` instead of synchronous shell execution? [33m 351[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 2106[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1666[2mms[22m[39m
 [32m✓[39m test/unit/warp/references-for-symbol.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 4532[2mms[22m[39m
     [33m[2m✓[22m[39m finds files that import a named symbol [33m 933[2mms[22m[39m
     [33m[2m✓[22m[39m finds aliased imports [33m 1027[2mms[22m[39m
     [33m[2m✓[22m[39m finds multiple referencing files [33m 624[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty for unreferenced symbol [33m 574[2mms[22m[39m
     [33m[2m✓[22m[39m finds namespace imports that reference the file [33m 722[2mms[22m[39m
     [33m[2m✓[22m[39m finds re-exports [33m 650[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-blame.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3411[2mms[22m[39m
     [33m[2m✓[22m[39m returns creation commit for a newly added function [33m 837[2mms[22m[39m
     [33m[2m✓[22m[39m detects last signature change across commits [33m 860[2mms[22m[39m
     [33m[2m✓[22m[39m returns reference count for a symbol [33m 645[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty result for unknown symbol [33m 489[2mms[22m[39m
     [33m[2m✓[22m[39m filters by file path when provided [33m 579[2mms[22m[39m
 [32m✓[39m test/unit/mcp/map-truncation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 5316[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when file count exceeds MAX_MAP_FILES [33m 1757[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when response bytes exceed MAX_MAP_BYTES [33m 1090[2mms[22m[39m
     [33m[2m✓[22m[39m returns summary-only with BUDGET_EXHAUSTED when session budget is drained [33m 1534[2mms[22m[39m
     [33m[2m✓[22m[39m does not truncate when within limits [33m 933[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3645[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 783[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 643[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 769[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 791[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 4198[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2529[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1667[2mms[22m[39m
 [32m✓[39m test/unit/operations/export-surface-diff.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 3014[2mms[22m[39m
     [33m[2m✓[22m[39m detects added exported function as minor semver impact [33m 349[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed exported function as major semver impact [33m 573[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed exported signature [33m 342[2mms[22m[39m
     [33m[2m✓[22m[39m ignores non-exported symbols [33m 553[2mms[22m[39m
     [33m[2m✓[22m[39m new file (not at base) produces added exports without throwing [33m 513[2mms[22m[39m
     [33m[2m✓[22m[39m deleted file (not at head) produces removed exports without throwing [33m 459[2mms[22m[39m
 [32m✓[39m test/unit/warp/index-head.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 2731[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a multi-file repo and resolves import references [33m 778[2mms[22m[39m
     [33m[2m✓[22m[39m handles aliased imports correctly [33m 733[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-parseable files gracefully [33m 470[2mms[22m[39m
     [33m[2m✓[22m[39m emits file nodes for all parsed files [33m 749[2mms[22m[39m
 [32m✓[39m tests/playback/0088-target-repo-git-hook-bootstrap.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3900[2mms[22m[39m
     [33m[2m✓[22m[39m writes target-repo git transition hooks with an explicit flag [33m 628[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1536[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 1189[2mms[22m[39m
 [32m✓[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 2483[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 2248[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2283[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 981[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 561[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 740[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-bridge.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 3264[2mms[22m[39m
     [33m[2m✓[22m[39m proxies daemon-only workspace binding flow through stdio [33m 1810[2mms[22m[39m
 [32m✓[39m test/unit/warp/reference-count.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 970[2mms[22m[39m
     [33m[2m✓[22m[39m returns zero references when no other file uses the symbol [33m 348[2mms[22m[39m
 [32m✓[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 4442[2mms[22m[39m
     [33m[2m✓[22m[39m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries? [33m 3899[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1621[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1545[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1095[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 1085[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 933[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 896[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2027[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1062[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 963[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 84[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 989[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 415[2mms[22m[39m
 [32m✓[39m test/unit/mcp/project-root-resolution.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 992[2mms[22m[39m
     [33m[2m✓[22m[39m uses explicit projectRoot over GRAFT_PROJECT_ROOT env var [33m 534[2mms[22m[39m
     [33m[2m✓[22m[39m uses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided [33m 449[2mms[22m[39m
 [32m✓[39m test/unit/mcp/worktree-identity-canonicalization.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 518[2mms[22m[39m
     [33m[2m✓[22m[39m produces the same worktreeId regardless of /tmp vs /private/tmp aliasing [33m 302[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 676[2mms[22m[39m
 [32m✓[39m test/unit/warp/full-ast.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m emits every tree-sitter node for a TypeScript file into the graph [33m 463[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 435[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 198[2mms[22m[39m
 [32m✓[39m test/unit/adapters/rotating-ndjson-log.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 104[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 120[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 117[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 77[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 86[2mms[22m[39m
 [32m✓[39m test/unit/ports/filesystem-contract.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-bad-code-burndown.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/path-resolver.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 67[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m tests/playback/0089-logical-warp-writer-lanes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m tests/playback/0090-symbol-identity-and-rename-continuity.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 75[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-code-review-fixes.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-stdio-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt-builder.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0092-daemon-session-directory-cleanup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/warp/context.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/secret-scrub.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tool-call-footprint.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/adapters/repo-paths-invariants.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v070-structural-history.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/metrics/metrics.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/operations/diff-identity.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/guards.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/codec-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0093-structural-queries-use-query-builder.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/cli/index-cmd.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-paths.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/context-guard.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/package-files-exist.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/warp-plumbing-conformance.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m tests/playback/0094-references-no-getEdges.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 46134[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 10486[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 34985[2mms[22m[39m

[2m Test Files [22m [1m[32m141 passed[39m[22m[90m (141)[39m
[2m      Tests [22m [1m[32m1175 passed[39m[22m[90m (1175)[39m
[2m   Start at [22m 21:35:39
[2m   Duration [22m 47.57s[2m (transform 6.58s, setup 0ms, import 39.54s, tests 349.94s, environment 14ms)[22m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 214 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_deprecate-index-commits`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_deprecate-index-commits
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
