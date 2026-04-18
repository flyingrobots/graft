---
title: "Verification Witness for Cycle 60"
---

# Verification Witness for Cycle 60

This witness proves that `Persisted sub-commit local history` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 7571[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 326[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 876[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 872[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 766[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 777[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 356[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 488[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 312[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 350[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 768[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 347[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 339[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 402[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7853[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1685[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1217[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1023[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1139[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 1366[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1422[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 8780[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 3776[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1733[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1579[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1690[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m31 tests[22m[2m)[22m[33m 10676[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 410[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 851[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 673[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 423[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 638[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 412[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 305[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 915[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 423[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 394[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 406[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 1128[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 11654[2mms[22m[39m
     [33m[2m✓[22m[39m shares one repo-scoped warp pool across sessions bound to the same repo [33m 3664[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 2067[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 1626[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 4006[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 12507[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 591[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1472[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1936[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1198[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1277[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 649[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 673[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 945[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 647[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1401[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 1558[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 13711[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 7391[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 494[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 5704[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6381[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 2102[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1973[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2293[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 6231[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 375[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 501[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 451[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 408[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 899[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 394[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 587[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 6014[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 743[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 441[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 336[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 445[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 398[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 814[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 502[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 302[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 400[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 552[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15772[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 3964[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 866[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1060[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 582[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 747[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 516[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 533[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 541[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 988[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 807[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1144[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1227[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 1156[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 1637[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4785[2mms[22m[39m
     [33m[2m✓[22m[39m requires explicit workspace authorization before daemon bind [33m 301[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 516[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1096[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 1226[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 380[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 859[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 325[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 16133[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1002[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1189[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1232[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2264[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 981[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 504[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 516[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 635[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 849[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 899[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 774[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1537[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1110[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1119[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 624[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4570[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 477[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 815[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 315[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 584[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 372[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 596[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 428[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 438[2mms[22m[39m
     [33m[2m✓[22m[39m includes base and head labels in result [33m 303[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 5013[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 669[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 534[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 943[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1194[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 1146[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3655[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 392[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 343[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 848[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 1250[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4054[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 815[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 769[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 1080[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 727[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1923[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 606[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 401[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 415[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 84[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2748[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1099[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 769[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 878[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3148[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 363[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 566[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 504[2mms[22m[39m
     [33m[2m✓[22m[39m returns null for file that doesn't exist at ref [33m 402[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 278[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 3484[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1939[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1259[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 103[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3544[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 105[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 3401[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2049[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1351[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 778[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 773[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 167[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 198[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 77[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1305[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1268[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m61 passed[39m[22m[90m (61)[39m
[2m      Tests [22m [1m[32m642 passed[39m[22m[90m (642)[39m
[2m   Start at [22m 21:55:56
[2m   Duration [22m 21.70s[2m (transform 3.64s, setup 0ms, import 15.86s, tests 167.01s, environment 4ms)[22m

Switched to a new branch 'feature/output-schema-attach'
Switched to a new branch 'feature/attach'
Preparing worktree (checking out 'secondary')
Preparing worktree (checking out 'secondary')
Switched to a new branch 'feature/history'
Preparing worktree (checking out 'secondary')
Preparing worktree (checking out 'secondary')

```

## Drift Results

```text
No drift output captured.
```

## Manual Verification

- [x] Automated capture completed successfully.
