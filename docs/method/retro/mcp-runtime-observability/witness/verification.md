---
title: "Verification Witness for Cycle 48"
---

# Verification Witness for Cycle 48

This witness proves that `Add structured runtime observability for the MCP surface` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 6290[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 316[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 404[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 7011[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 351[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 1135[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 889[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1745[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 640[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 390[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 864[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 316[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7924[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1940[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1785[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1004[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1076[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 709[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1400[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 8912[2mms[22m[39m
     [33m[2m✓[22m[39m registers every tool in TOOL_REGISTRY [33m 698[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 429[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 459[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 543[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 742[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 516[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 540[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 480[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 386[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 398[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 323[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 348[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 528[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 9759[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4866[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2503[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2383[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 9617[2mms[22m[39m
     [33m[2m✓[22m[39m exports JSON Schema objects for every MCP tool and CLI command [33m 314[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 5384[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 454[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 3289[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 4712[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 601[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 352[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 472[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 616[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 450[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 309[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 5028[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 433[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 337[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 456[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 441[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 664[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 397[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2510[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1250[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 649[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 611[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 2934[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 347[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 896[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 430[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 370[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 522[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 366[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1682[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 411[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 303[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 312[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 357[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 13189[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1502[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 2194[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2385[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1049[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1376[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 623[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 943[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1559[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 576[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 853[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 4125[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 439[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 342[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 571[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 345[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 79[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 221[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1169[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 366[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 452[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 168[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 149[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 694[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13643[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5951[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 476[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 540[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 500[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 735[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 326[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 315[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 444[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 666[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 658[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1018[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 437[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 640[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 925[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 83[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 1824[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 71[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 144[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 55[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 630[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 625[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 14725[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1464[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1470[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1143[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2776[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 916[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 388[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 470[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 824[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 561[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1041[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 817[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1057[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 706[2mms[22m[39m

[2m Test Files [22m [1m[32m45 passed[39m[22m[90m (45)[39m
[2m      Tests [22m [1m[32m551 passed[39m[22m[90m (551)[39m
[2m   Start at [22m 11:19:12
[2m   Duration [22m 15.67s[2m (transform 2.56s, setup 0ms, import 11.01s, tests 117.53s, environment 3ms)[22m
```

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
