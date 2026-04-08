---
title: "Verification Witness for Cycle 46"
---

# Verification Witness for Cycle 46

This witness proves that `Default governed read path` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 6258[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 604[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 691[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 674[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 653[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 840[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 562[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 308[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 396[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 6615[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 304[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 920[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 1153[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1634[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 649[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 865[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 356[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 6573[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 416[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 764[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 694[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 691[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 565[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 569[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 306[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 321[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 7578[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 567[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 484[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 567[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 420[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 664[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 547[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 354[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 489[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 400[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 576[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 8805[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4612[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2162[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2031[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8908[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 5523[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 428[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 2840[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3485[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 3957[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId differs between servers [33m 425[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 309[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 388[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 4347[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 498[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 369[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 645[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 789[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 1110[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 934[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2369[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 504[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 495[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3264[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 391[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 621[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 672[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 697[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 548[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 331[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2587[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1142[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 756[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 688[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 118[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 146[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 840[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 12588[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1122[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1973[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2642[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 872[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1053[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 609[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 1091[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1605[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 553[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 908[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 125[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 577[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 572[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 209[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 97[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 100[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 12945[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5314[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 493[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 551[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 550[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 374[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 635[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 670[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 525[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1204[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 480[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 766[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 837[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 96[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 2056[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 453[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 370[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 365[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 518[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 14092[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1345[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1138[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1419[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2613[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 623[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 416[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 777[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 1016[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 481[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 402[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1011[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 993[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 380[2mms[22m[39m

[2m Test Files [22m [1m[32m44 passed[39m[22m[90m (44)[39m
[2m      Tests [22m [1m[32m544 passed[39m[22m[90m (544)[39m
[2m   Start at [22m 10:50:56
[2m   Duration [22m 14.90s[2m (transform 2.21s, setup 0ms, import 9.64s, tests 108.95s, environment 5ms)[22m
```

## Additional Verification

- `pnpm exec vitest run test/unit/hooks/pretooluse-read.test.ts test/unit/hooks/posttooluse-read.test.ts test/unit/policy/cross-surface-parity.test.ts`
- `pnpm lint src/hooks/read-governor.ts src/hooks/read-messages.ts src/hooks/pretooluse-read.ts src/hooks/posttooluse-read.ts test/unit/hooks/pretooluse-read.test.ts test/unit/hooks/posttooluse-read.test.ts test/unit/policy/cross-surface-parity.test.ts`
- `pnpm lint`

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
- [x] Full lint passed.
- [x] Focused hook and parity witnesses passed.
