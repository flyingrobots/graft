---
title: "Verification Witness for Cycle 44"
---

# Verification Witness for Cycle 44

This witness proves that `Cycle 0044 — code_find substring search` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5083[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 305[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 5767[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 326[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 632[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 827[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 333[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 420[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 381[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 414[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId differs between servers [33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 685[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 322[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 6380[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 439[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 1021[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 1374[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1167[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 634[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 361[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 6121[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 944[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 665[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 580[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 423[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 602[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 506[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 6336[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 329[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 892[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 762[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 716[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 465[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 484[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 638[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 410[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 309[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3420[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 306[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 362[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array when no changes [33m 633[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 486[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getChangedFiles [33m 416[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getFileAtRef [33m 306[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 10281[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4650[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1948[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 3671[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4390[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 717[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1052[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 842[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1125[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 649[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1731[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 406[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 430[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 305[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 214[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 1125[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1116[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 3689[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1073[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1140[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 1474[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 282[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8966[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 3199[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 1073[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 4564[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8199[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 848[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1449[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1044[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m keeps soft-pressure behavior honest across hooks and safe_read [33m 1572[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 2215[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 415[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 228[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 98[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 8822[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 587[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 567[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 441[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 332[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 395[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 448[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 402[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 427[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 458[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 1030[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 15477[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1991[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1520[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1925[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1040[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1954[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 1421[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 1087[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1600[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 1298[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1481[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 47[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 357[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15733[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5025[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 475[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 607[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 322[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 687[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 596[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 1039[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 426[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1177[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 435[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1296[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 998[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 1369[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 1270[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 16825[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1322[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1175[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 869[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2651[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 688[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 569[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 779[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 1027[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 1128[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 636[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 767[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 399[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1814[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1598[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 981[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 412[2mms[22m[39m

[2m Test Files [22m [1m[32m42 passed[39m[22m[90m (42)[39m
[2m      Tests [22m [1m[32m528 passed[39m[22m[90m (528)[39m
[2m   Start at [22m 09:37:25
[2m   Duration [22m 17.82s[2m (transform 2.77s, setup 0ms, import 12.68s, tests 130.26s, environment 3ms)[22m
```

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
