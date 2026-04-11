---
title: "Verification Witness for Cycle 52"
---

# Verification Witness for Cycle 52

This witness proves that `Workspace bind and routing surface for the local shared daemon` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 7062[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 358[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 714[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 485[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 425[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 432[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 375[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 697[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 606[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId differs between servers [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 680[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 306[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 7112[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 362[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 901[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 606[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 783[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 474[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 657[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 538[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 467[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 498[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7754[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1972[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1581[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1384[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1103[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 802[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 909[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 8767[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4003[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2894[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1867[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 8867[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 995[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 537[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 405[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 460[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 454[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 553[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 376[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 418[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 500[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 412[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 321[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 1017[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 9851[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 6051[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 3221[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 3976[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 538[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 581[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 596[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 2397[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 636[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 306[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 615[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 525[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 4187[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 425[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 508[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 335[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 360[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 319[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 474[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 304[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 373[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3141[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 590[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 305[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 385[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 889[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 622[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 12271[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1066[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1749[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2598[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1306[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 828[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 594[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 1096[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1045[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1238[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2560[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 1984[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 742[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 724[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 518[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 79[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 171[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 181[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 66[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13356[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5195[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 849[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 648[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 304[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 416[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 325[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 769[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 437[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 731[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 323[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 818[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 797[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 754[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 981[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 719[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 715[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1136[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 343[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 416[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2012[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 333[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1081[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 359[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 1633[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 351[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 868[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 352[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 14374[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1379[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1196[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1257[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2971[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 501[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 575[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 816[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 685[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 402[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 422[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 760[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 914[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1028[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 643[2mms[22m[39m

[2m Test Files [22m [1m[32m46 passed[39m[22m[90m (46)[39m
[2m      Tests [22m [1m[32m559 passed[39m[22m[90m (559)[39m
[2m   Start at [22m 13:56:06
[2m   Duration [22m 15.23s[2m (transform 2.53s, setup 0ms, import 10.85s, tests 115.02s, environment 3ms)[22m

Preparing worktree (checking out 'secondary')
```

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
