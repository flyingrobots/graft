---
title: "Verification Witness for Cycle 51"
---

# Verification Witness for Cycle 51

This witness proves that `System-wide MCP daemon and workspace binding` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```
> @flyingrobots/graft@0.4.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m/Users/james/git/graft[39m

 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 7492[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 326[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 1182[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 964[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 1502[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 770[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 946[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 782[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 468[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 372[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 7548[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 777[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 566[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 631[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 622[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 890[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 741[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 484[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 471[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 433[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 333[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8460[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1886[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1480[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1587[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1439[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 854[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 1210[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 9358[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 702[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 543[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 436[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 460[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 428[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 588[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 494[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 526[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 473[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 479[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 319[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 375[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 338[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 403[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 607[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 9694[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 4602[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 3053[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2032[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 9706[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 5950[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 554[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 2832[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 4596[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 314[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 391[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 317[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 322[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 305[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 453[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 458[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 483[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 2678[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 308[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 446[2mms[22m[39m
     [33m[2m✓[22m[39m returns null for file that doesn't exist at ref [33m 383[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getChangedFiles [33m 339[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getFileAtRef [33m 405[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3425[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 309[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 4496[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 388[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 433[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 309[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2692[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1034[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 723[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 13408[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1532[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1659[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 2791[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1384[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1036[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 834[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 675[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1029[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 1164[2mms[22m[39m
     [33m[2m✓[22m[39m returns zero for empty commit range [33m 313[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 987[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 61[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3492[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 309[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 519[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 768[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 907[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 631[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 354[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 157[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 94[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 111[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 56[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 882[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 427[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13954[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5697[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 852[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 683[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 304[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 619[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 516[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 433[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 310[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 428[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1257[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1068[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 638[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 857[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 527[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 859[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1623[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 380[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 386[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 347[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 14932[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1385[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1158[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1229[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 3674[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 724[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 512[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 432[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 456[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 414[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 516[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 882[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 937[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 821[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 908[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 403[2mms[22m[39m

[2m Test Files [22m [1m[32m45 passed[39m[22m[90m (45)[39m
[2m      Tests [22m [1m[32m553 passed[39m[22m[90m (553)[39m
[2m   Start at [22m 13:33:15
[2m   Duration [22m 15.77s[2m (transform 2.34s, setup 0ms, import 9.80s, tests 120.54s, environment 10ms)[22m
```

## Drift Results

```

```

## Manual Verification

- [x] Automated capture completed successfully.
