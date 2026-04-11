---
title: "Verification Witness for Cycle 50"
---

# Verification Witness for Cycle 50

This witness proves that `Define auth, authorization, and isolation for a shared daemon` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 8059[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 349[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 802[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 1038[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1598[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 873[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 1179[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 1027[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 599[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 384[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 7856[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 810[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 671[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 752[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 772[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 665[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 999[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 741[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 400[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 503[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 540[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 312[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 9204[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1749[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1698[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1786[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1312[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 837[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1803[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 10578[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4354[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 3739[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2483[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 10422[2mms[22m[39m
     [33m[2m✓[22m[39m registers every tool in TOOL_REGISTRY [33m 421[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 410[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 560[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 580[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 470[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 560[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 471[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 444[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 503[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 564[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 385[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 360[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 324[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 362[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 416[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 335[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 818[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 10391[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 6223[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 506[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 3432[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 6020[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 574[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 466[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 563[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 964[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 482[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 607[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 447[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3193[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 447[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 554[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 634[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 5728[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 376[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 563[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 372[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 485[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 425[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 444[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 322[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 428[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 3830[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1563[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1265[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 996[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 15751[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1214[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 2034[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 3210[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1595[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1107[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 1266[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 814[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1589[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 1374[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1389[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 4556[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 368[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 733[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1004[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 857[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 650[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 942[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 177[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 118[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5284[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 424[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 147[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 129[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 912[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 330[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 16305[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 6167[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 759[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 662[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 332[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 807[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 727[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 531[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 468[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 448[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 631[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1862[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 578[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 1414[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 916[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 534[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 530[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 67[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 834[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 307[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1650[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 519[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 328[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 323[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 17132[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1315[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1285[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1329[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 3666[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 550[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 721[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 683[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 723[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 809[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1219[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 779[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1649[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 942[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 488[2mms[22m[39m

[2m Test Files [22m [1m[32m45 passed[39m[22m[90m (45)[39m
[2m      Tests [22m [1m[32m553 passed[39m[22m[90m (553)[39m
[2m   Start at [22m 12:57:24
[2m   Duration [22m 18.40s[2m (transform 4.19s, setup 0ms, import 14.71s, tests 139.11s, environment 5ms)[22m
```

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
