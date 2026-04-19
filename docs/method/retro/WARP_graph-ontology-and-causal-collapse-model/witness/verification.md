---
title: "Verification Witness for Cycle 59"
---

# Verification Witness for Cycle 59

This witness proves that `WARP graph ontology and causal collapse model` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 7294[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 492[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 822[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 496[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 600[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 465[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 593[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 476[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 401[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 701[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 445[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 7584[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 525[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 1037[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 899[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 988[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 478[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 414[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 409[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 404[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 326[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 666[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 308[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8004[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1944[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1620[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 832[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1238[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 1091[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1277[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 8367[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 3797[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1601[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1332[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1636[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 9415[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 844[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 597[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 489[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 319[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 316[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 301[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 611[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 338[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 311[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 794[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 425[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 11855[2mms[22m[39m
     [33m[2m✓[22m[39m shares one repo-scoped warp pool across sessions bound to the same repo [33m 4272[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 1709[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 1558[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 4213[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 13221[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 923[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1996[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1861[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1183[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1072[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 542[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 579[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 958[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 855[2mms[22m[39m
     [33m[2m✓[22m[39m returns zero for empty commit range [33m 399[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1122[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 1728[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4722[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 551[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 591[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 614[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 572[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 415[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 570[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 325[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 356[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 565[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4800[2mms[22m[39m
     [33m[2m✓[22m[39m requires explicit workspace authorization before daemon bind [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 921[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 654[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 1451[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 332[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 716[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 5698[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 506[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 403[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 562[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 359[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 532[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 511[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 422[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 344[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 303[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 335[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 404[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 5965[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 2366[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2016[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1582[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 4072[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 676[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 877[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 461[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 758[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 730[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 567[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 2508[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1346[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 962[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15121[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 4489[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 885[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 946[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 446[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 740[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 484[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 474[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 577[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1196[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 599[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1325[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 828[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 920[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 1210[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 16450[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1706[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1508[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 865[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2329[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 495[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 506[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 639[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 889[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 983[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1044[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 564[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1097[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 991[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 866[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 910[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2856[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 385[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 418[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2534[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array when no changes [33m 353[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 518[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2649[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1407[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1241[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1227[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 463[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 103[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2289[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 793[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 851[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 642[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3043[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 556[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 496[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 938[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 477[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 575[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1077[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1040[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 290[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 159[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 78[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 122[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 70[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 780[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 775[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1599[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 443[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 357[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 416[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7005[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 4815[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 1840[2mms[22m[39m

[2m Test Files [22m [1m[32m59 passed[39m[22m[90m (59)[39m
[2m      Tests [22m [1m[32m624 passed[39m[22m[90m (624)[39m
[2m   Start at [22m 18:05:55
[2m   Duration [22m 21.57s[2m (transform 3.54s, setup 0ms, import 14.86s, tests 151.26s, environment 5ms)[22m

Preparing worktree (checking out 'secondary')
Preparing worktree (checking out 'secondary')
Preparing worktree (checking out 'secondary')
Preparing worktree (checking out 'secondary')

```

## Drift Results

```text
No drift output captured.
```

## Manual Verification

- [x] Automated capture completed successfully.
# 0059 verification

## Focused witness

```bash
pnpm exec vitest run \
  test/unit/contracts/causal-ontology.test.ts \
  test/unit/mcp/runtime-causal-context.test.ts \
  test/unit/mcp/runtime-staged-target.test.ts \
  test/unit/mcp/runtime-observability.test.ts \
  tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts
```

Result:
- `5` files passed
- `22` tests passed

## Runtime contract witness

```bash
pnpm exec tsc --noEmit --pretty false
pnpm lint
pnpm test
git diff --check
```

Result:
- `tsc` passed
- `lint` passed
- full suite passed: `59` files, `624` tests
- `git diff --check` passed

## Drift witness

```bash
method_drift 0059-graph-ontology-and-causal-collapse-model
```

Result:
- `No playback-question drift found.`
- `Scanned 1 active cycle, 9 playback questions, 18 test descriptions.`

## Cycle reading

The witness shows that `0059` is no longer only design prose:

- the ontology contract is executable in playback tests
- typed contracts exist for actors, evidence, confidence, footprints,
  staged targets, causal events, and collapse witnesses
- runtime-local causal context is inspectable and clearly labeled as
  `artifact_history`
- `doctor` now exposes a bounded staged-target view with honest
  availability states:
  - `none`
  - `full_file`
  - `ambiguous`
- rename-shaped index selections are handled as destination-path
  artifacts on the runtime-local surface, while deeper rename
  continuity remains a separate WARP concern
