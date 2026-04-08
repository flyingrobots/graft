---
title: "Verification Witness for Cycle 47"
---

# Verification Witness for Cycle 47

This witness proves that `Non-Claude default-governed read integration` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 6854[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 323[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 832[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 1274[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1729[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 676[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 801[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 483[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 302[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 6779[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 835[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 756[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 882[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 613[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 823[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 623[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 336[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 7008[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 545[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 872[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 635[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1017[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 743[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 602[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 547[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 532[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 7938[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 874[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 549[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 514[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 415[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 703[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 377[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 430[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 360[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 313[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 334[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 467[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 8858[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4733[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2250[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1872[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 9221[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 5634[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 423[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 2909[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3619[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 4010[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 329[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 507[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 438[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 416[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2366[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 515[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 484[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 313[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3567[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 618[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 610[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 805[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 577[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2722[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1106[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1033[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 581[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 5033[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 438[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 672[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 666[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1207[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 1213[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 836[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 102[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 94[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 88[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 635[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 106[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 12989[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1373[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 2208[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2462[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 875[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 991[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 799[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 1093[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1675[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 523[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 853[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 173[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 464[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 460[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13098[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5572[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 479[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 504[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 322[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 449[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 354[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 432[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 805[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 617[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1367[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 465[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 622[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 828[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1680[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 320[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 358[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 434[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 14079[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1354[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1278[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1270[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2868[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 544[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 329[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 488[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 445[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 1026[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 783[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 825[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 406[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 827[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 309[2mms[22m[39m

[2m Test Files [22m [1m[32m44 passed[39m[22m[90m (44)[39m
[2m      Tests [22m [1m[32m546 passed[39m[22m[90m (546)[39m
[2m   Start at [22m 11:01:51
[2m   Duration [22m 14.87s[2m (transform 1.96s, setup 0ms, import 8.85s, tests 111.68s, environment 3ms)[22m
```

## Additional Verification

- `pnpm exec vitest run test/unit/cli/init.test.ts`
- `pnpm lint src/cli/init.ts test/unit/cli/init.test.ts`
- `pnpm lint`

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
- [x] Focused `graft init` tests passed.
- [x] Full lint passed.
