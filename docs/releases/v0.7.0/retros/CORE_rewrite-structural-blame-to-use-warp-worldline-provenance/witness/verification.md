---
title: "Verification Witness for Cycle CORE_rewrite-structural-blame-to-use-warp-worldline-provenance"
---

# Verification Witness for Cycle CORE_rewrite-structural-blame-to-use-warp-worldline-provenance

This witness proves that `Use ProvenanceIndex for structural-blame last-touch provenance` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.7.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [32m✓[39m test/unit/warp/dead-symbols.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 10874[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty when no symbols have been removed [33m 694[2mms[22m[39m
     [33m[2m✓[22m[39m detects a symbol removed and not re-added [33m 3160[2mms[22m[39m
     [33m[2m✓[22m[39m excludes symbols that were removed then re-added [33m 2556[2mms[22m[39m
     [33m[2m✓[22m[39m respects maxCommits to limit search depth [33m 2306[2mms[22m[39m
     [33m[2m✓[22m[39m detects removals across multiple files [33m 2157[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 13460[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 4716[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 681[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 749[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 405[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 746[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 473[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 437[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 441[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 664[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 459[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1011[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 578[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 903[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 1185[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 14305[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 2239[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 2463[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 967[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 863[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 904[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 710[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 488[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 710[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 856[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 643[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 734[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 872[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 782[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 14846[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 1398[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 2275[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 1240[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 514[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 508[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 595[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 899[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 856[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 954[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 558[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 502[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 456[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 933[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 544[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 496[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 573[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 606[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 15305[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 2534[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 1410[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 935[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 892[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 708[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 997[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 785[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 1013[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 1285[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 912[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 1547[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 816[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 704[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 759[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 15574[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 1446[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 2963[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 959[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1048[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 888[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 828[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 837[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 822[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 837[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 1079[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 945[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 557[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 810[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 771[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 757[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 16042[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1842[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 1674[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1713[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 1732[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 913[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 457[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 453[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 721[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 738[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 710[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 668[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 553[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 335[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1024[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1052[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 792[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m20 tests[22m[2m)[22m[33m 7999[2mms[22m[39m
     [33m[2m✓[22m[39m runs doctor sludge scan through the top-level doctor alias [33m 639[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1067[2mms[22m[39m
     [33m[2m✓[22m[39m runs symbol difficulty through the grouped CLI surface [33m 1402[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 625[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 2657[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1313[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6988[2mms[22m[39m
     [33m[2m✓[22m[39m shares daemon-wide workspace authorization and bound session state across sessions on the same repo [33m 3727[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 2001[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 1259[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 6822[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 885[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1355[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1294[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1084[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 1245[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 958[2mms[22m[39m
 [32m✓[39m test/unit/warp/symbol-timeline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 6152[2mms[22m[39m
     [33m[2m✓[22m[39m returns a single entry for a newly added symbol [33m 1088[2mms[22m[39m
     [33m[2m✓[22m[39m tracks signature changes across commits in tick order [33m 1727[2mms[22m[39m
     [33m[2m✓[22m[39m detects removal with present=false [33m 857[2mms[22m[39m
     [33m[2m✓[22m[39m filters by filePath [33m 1203[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty for nonexistent symbol [33m 319[2mms[22m[39m
     [33m[2m✓[22m[39m does not infer removed symbol identity from name-only history [33m 860[2mms[22m[39m
 [32m✓[39m test/unit/warp/references-for-symbol.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 6525[2mms[22m[39m
     [33m[2m✓[22m[39m finds files that import a named symbol [33m 1420[2mms[22m[39m
     [33m[2m✓[22m[39m finds aliased imports [33m 1399[2mms[22m[39m
     [33m[2m✓[22m[39m finds multiple referencing files [33m 1622[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty for unreferenced symbol [33m 686[2mms[22m[39m
     [33m[2m✓[22m[39m finds namespace imports that reference the file [33m 636[2mms[22m[39m
     [33m[2m✓[22m[39m finds re-exports [33m 760[2mms[22m[39m
 [32m✓[39m test/unit/mcp/knowledge-map.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 7592[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty map when no files have been read [33m 954[2mms[22m[39m
     [33m[2m✓[22m[39m reports observed files after reads [33m 1435[2mms[22m[39m
     [33m[2m✓[22m[39m detects stale files that changed since last read [33m 1248[2mms[22m[39m
     [33m[2m✓[22m[39m tracks multiple files [33m 966[2mms[22m[39m
     [33m[2m✓[22m[39m reports correct readCount for re-read files [33m 1151[2mms[22m[39m
     [33m[2m✓[22m[39m includes directory coverage summary [33m 635[2mms[22m[39m
     [33m[2m✓[22m[39m staleFiles is empty when nothing changed [33m 1199[2mms[22m[39m
 [32m✓[39m test/unit/mcp/background-indexing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 6606[2mms[22m[39m
     [33m[2m✓[22m[39m monitor nudge triggers an immediate tick that indexes [33m 4624[2mms[22m[39m
     [33m[2m✓[22m[39m tool calls are not blocked during active indexing [33m 1977[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m33 tests[22m[2m)[22m[33m 24954[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 1725[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 2225[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 969[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 504[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 640[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 601[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 494[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 469[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 499[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns sludge signals when requested [33m 570[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 463[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 777[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 1184[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 442[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 722[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 464[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 727[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 1435[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 1013[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 995[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 500[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 539[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 531[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 322[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 317[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 2508[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 1074[2mms[22m[39m
 [32m✓[39m test/unit/warp/refactor-difficulty.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6337[2mms[22m[39m
     [33m[2m✓[22m[39m combines aggregate churn curvature with reference friction [33m 2052[2mms[22m[39m
     [33m[2m✓[22m[39m keeps high-churn symbols low risk when no other file references them [33m 2083[2mms[22m[39m
     [33m[2m✓[22m[39m returns duplicate symbol matches ranked by score when path is omitted [33m 1935[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 6511[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1205[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 533[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1321[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 1671[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 728[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 647[2mms[22m[39m
 [32m✓[39m test/unit/warp/structural-queries.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 6430[2mms[22m[39m
       [33m[2m✓[22m[39m returns added symbols for a commit that adds functions [33m 966[2mms[22m[39m
       [33m[2m✓[22m[39m returns changed symbols when a function signature is modified [33m 1614[2mms[22m[39m
       [33m[2m✓[22m[39m returns removed symbols when a function is deleted [33m 1275[2mms[22m[39m
       [33m[2m✓[22m[39m returns commits that touched a symbol in order [33m 1332[2mms[22m[39m
       [33m[2m✓[22m[39m filters by filePath when provided [33m 1242[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 5207[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 826[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 707[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 524[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 680[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 439[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 776[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 724[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 528[2mms[22m[39m
 [32m✓[39m test/unit/warp/ast-import-resolver.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 6155[2mms[22m[39m
     [33m[2m✓[22m[39m named import: references sym node in target file [33m 929[2mms[22m[39m
     [33m[2m✓[22m[39m aliased import: import { foo as baz } references foo [33m 1006[2mms[22m[39m
     [33m[2m✓[22m[39m default import: import foo from './bar' references default [33m 424[2mms[22m[39m
     [33m[2m✓[22m[39m namespace import: import * as ns references the file [33m 685[2mms[22m[39m
     [33m[2m✓[22m[39m re-export: export { foo } from './bar' references sym [33m 507[2mms[22m[39m
     [33m[2m✓[22m[39m wildcard re-export: export * from './bar' reexports file [33m 567[2mms[22m[39m
     [33m[2m✓[22m[39m resolves_to edge: module path resolves to file node [33m 564[2mms[22m[39m
     [33m[2m✓[22m[39m resolves TypeScript ESM .js specifiers to .ts source files [33m 538[2mms[22m[39m
     [33m[2m✓[22m[39m non-relative import: no resolves_to edge, but AST still emitted [33m 443[2mms[22m[39m
     [33m[2m✓[22m[39m dynamic import: import('./foo') resolves to file [33m 491[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-blame.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 5378[2mms[22m[39m
     [33m[2m✓[22m[39m returns creation commit for a newly added function [33m 1165[2mms[22m[39m
     [33m[2m✓[22m[39m detects last signature change across commits [33m 1551[2mms[22m[39m
     [33m[2m✓[22m[39m returns reference count for a symbol [33m 1191[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty result for unknown symbol [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m filters by file path when provided [33m 1105[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 4942[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 1735[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1157[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 992[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1056[2mms[22m[39m
 [32m✓[39m test/unit/operations/export-surface-diff.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 5320[2mms[22m[39m
     [33m[2m✓[22m[39m detects added exported function as minor semver impact [33m 305[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed exported function as major semver impact [33m 434[2mms[22m[39m
     [33m[2m✓[22m[39m classifies adding a required exported parameter as major semver impact [33m 384[2mms[22m[39m
     [33m[2m✓[22m[39m classifies adding an optional exported parameter as minor semver impact [33m 303[2mms[22m[39m
     [33m[2m✓[22m[39m classifies removed optional exported parameter as major semver impact [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m classifies parameter type changes as major semver impact [33m 308[2mms[22m[39m
     [33m[2m✓[22m[39m classifies exported return type changes as major semver impact [33m 327[2mms[22m[39m
     [33m[2m✓[22m[39m classifies parameter rename-only signature changes as patch semver impact [33m 397[2mms[22m[39m
     [33m[2m✓[22m[39m ignores non-exported symbols [33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m new file (not at base) produces added exports without throwing [33m 807[2mms[22m[39m
     [33m[2m✓[22m[39m deleted file (not at head) produces removed exports without throwing [33m 510[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6212[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 1536[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 1173[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 3442[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 4814[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 653[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 842[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 549[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 362[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 473[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single modified FileDiff at new path [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with symbol changes shows accurate diff [33m 332[2mms[22m[39m
 [32m✓[39m test/unit/warp/warp-structural-churn.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 5121[2mms[22m[39m
     [33m[2m✓[22m[39m counts symbol changes across commits without git log [33m 2194[2mms[22m[39m
     [33m[2m✓[22m[39m counts removed symbols discovered from tick receipts [33m 1230[2mms[22m[39m
     [33m[2m✓[22m[39m computes change counts through QueryBuilder.aggregate [33m 563[2mms[22m[39m
     [33m[2m✓[22m[39m respects limit parameter [33m 467[2mms[22m[39m
     [33m[2m✓[22m[39m makes zero GitClient calls [33m 506[2mms[22m[39m
 [32m✓[39m test/unit/operations/structural-review.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 5450[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes structural vs formatting files [33m 548[2mms[22m[39m
     [33m[2m✓[22m[39m categorizes test, docs, and config files [33m 1103[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: removed export [33m 798[2mms[22m[39m
     [33m[2m✓[22m[39m detects breaking changes: changed signature [33m 387[2mms[22m[39m
     [33m[2m✓[22m[39m renders a human-readable summary [33m 407[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag removal of non-exported symbol as breaking [33m 394[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT flag signature change of non-exported symbol as breaking [33m 424[2mms[22m[39m
     [33m[2m✓[22m[39m flags only exported removals in mixed exported/non-exported changes [33m 341[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file with actual symbol removal flags only the real removal [33m 434[2mms[22m[39m
     [33m[2m✓[22m[39m renamed file appears as single entry, not delete + add pair [33m 324[2mms[22m[39m
 [32m✓[39m test/unit/warp/warp-structural-log.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 4855[2mms[22m[39m
     [33m[2m✓[22m[39m returns structural log entries from WARP graph without git log [33m 1940[2mms[22m[39m
     [33m[2m✓[22m[39m respects limit parameter [33m 2372[2mms[22m[39m
     [33m[2m✓[22m[39m includes commit SHA in each entry [33m 384[2mms[22m[39m
 [32m✓[39m test/unit/warp/drift-sentinel.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 6160[2mms[22m[39m
     [33m[2m✓[22m[39m detects a stale symbol reference after signature change [33m 2189[2mms[22m[39m
     [33m[2m✓[22m[39m passes when docs are fresh (no changes since doc was written) [33m 1405[2mms[22m[39m
     [33m[2m✓[22m[39m honors the optional markdown path pattern [33m 1274[2mms[22m[39m
     [33m[2m✓[22m[39m produces machine-readable output with file, symbol, and nature [33m 869[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a repo with no markdown files [33m 421[2mms[22m[39m
 [32m✓[39m test/unit/warp/warp-reference-count.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 5742[2mms[22m[39m
     [33m[2m✓[22m[39m counts references from multiple importing files [33m 2140[2mms[22m[39m
     [33m[2m✓[22m[39m returns count=0 for an exported but never imported symbol [33m 664[2mms[22m[39m
     [33m[2m✓[22m[39m distinguishes same-named symbols in different files [33m 1141[2mms[22m[39m
     [33m[2m✓[22m[39m returns count=0 for a symbol not in the graph [33m 480[2mms[22m[39m
     [33m[2m✓[22m[39m counts re-exports as references [33m 1312[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 3906[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 331[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array for no changes [33m 350[2mms[22m[39m
     [33m[2m✓[22m[39m handles multiple renames in same commit [33m 493[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 4622[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 1442[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1236[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 1943[2mms[22m[39m
 [32m✓[39m tests/playback/0088-target-repo-git-hook-bootstrap.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3630[2mms[22m[39m
     [33m[2m✓[22m[39m writes target-repo git transition hooks with an explicit flag [33m 505[2mms[22m[39m
     [33m[2m✓[22m[39m respects configured core.hooksPath and preserves external target-repo hooks [33m 401[2mms[22m[39m
     [33m[2m✓[22m[39m installed target-repo git hooks append transition events when executed [33m 519[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1381[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 753[2mms[22m[39m
 [32m✓[39m test/unit/warp/index-head.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4630[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a multi-file repo and resolves import references [33m 1329[2mms[22m[39m
     [33m[2m✓[22m[39m handles aliased imports correctly [33m 1697[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-parseable files gracefully [33m 528[2mms[22m[39m
     [33m[2m✓[22m[39m emits file nodes for all parsed files [33m 886[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 2997[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1092[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1163[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 740[2mms[22m[39m
 [32m✓[39m test/unit/warp/warp-structural-blame.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 5080[2mms[22m[39m
     [33m[2m✓[22m[39m returns blame info for a symbol from WARP graph without git calls [33m 1200[2mms[22m[39m
     [33m[2m✓[22m[39m tracks signature changes in blame history [33m 2186[2mms[22m[39m
     [33m[2m✓[22m[39m includes reference count from WARP graph [33m 1233[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty blame for nonexistent symbol [33m 459[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 3146[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1575[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 1327[2mms[22m[39m
 [32m✓[39m test/unit/mcp/map-truncation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 5041[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when file count exceeds MAX_MAP_FILES [33m 1546[2mms[22m[39m
     [33m[2m✓[22m[39m truncates to summary-only when response bytes exceed MAX_MAP_BYTES [33m 1474[2mms[22m[39m
     [33m[2m✓[22m[39m returns summary-only with BUDGET_EXHAUSTED when session budget is drained [33m 1330[2mms[22m[39m
     [33m[2m✓[22m[39m does not truncate when within limits [33m 689[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 6026[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 1632[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 465[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 364[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 414[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 505[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 371[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 3843[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 710[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 513[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 444[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 558[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 759[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 855[2mms[22m[39m
 [32m✓[39m test/unit/mcp/monitor-tick-ceiling.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 2646[2mms[22m[39m
     [33m[2m✓[22m[39m indexes when HEAD differs from lastIndexedCommit [33m 751[2mms[22m[39m
     [33m[2m✓[22m[39m indexes on first run when lastIndexedCommit is null [33m 703[2mms[22m[39m
     [33m[2m✓[22m[39m consecutive ticks with same HEAD: second tick skips [33m 778[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2092[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 2019[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 3250[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2367[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 882[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-bridge.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 1663[2mms[22m[39m
     [33m[2m✓[22m[39m proxies daemon-only workspace binding flow through stdio [33m 576[2mms[22m[39m
 [32m✓[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3575[2mms[22m[39m
     [33m[2m✓[22m[39m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries? [33m 3177[2mms[22m[39m
 [32m✓[39m test/unit/warp/stale-docs.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 4054[2mms[22m[39m
       [33m[2m✓[22m[39m flags a symbol that changed after the doc was committed [33m 1776[2mms[22m[39m
       [33m[2m✓[22m[39m does not flag a symbol that has not changed since the doc [33m 1508[2mms[22m[39m
       [33m[2m✓[22m[39m reports unknown symbols not in the WARP graph [33m 766[2mms[22m[39m
 [32m✓[39m test/unit/helpers/mcp.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1265[2mms[22m[39m
     [33m[2m✓[22m[39m scrubs inherited live-repo Git environment for createServerInRepo [33m 659[2mms[22m[39m
     [33m[2m✓[22m[39m does not eagerly open WARP local-history graph for createServerInRepo [33m 604[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 4180[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 878[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 1012[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 735[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 749[2mms[22m[39m
 [32m✓[39m test/unit/operations/cross-session-resume.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1323[2mms[22m[39m
     [33m[2m✓[22m[39m handles deleted files [33m 354[2mms[22m[39m
 [32m✓[39m test/unit/operations/conversation-primer.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 1215[2mms[22m[39m
 [32m✓[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1635[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 1455[2mms[22m[39m
 [32m✓[39m test/unit/warp/traverse-hydrate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1198[2mms[22m[39m
     [33m[2m✓[22m[39m returns hydrated nodes from a single BFS + query call [33m 598[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array when no nodes are reachable [33m 599[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1456[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 760[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 690[2mms[22m[39m
 [32m✓[39m test/unit/warp/open.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 980[2mms[22m[39m
     [33m[2m✓[22m[39m auto-checkpoints after enough patches are materialized [33m 978[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1063[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m28 tests[22m[2m)[22m[33m 654[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1241[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 1229[2mms[22m[39m
 [32m✓[39m test/unit/warp/full-ast.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 655[2mms[22m[39m
     [33m[2m✓[22m[39m keeps graph state compact and stores the full tree as attached content [33m 653[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 703[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 669[2mms[22m[39m
 [32m✓[39m test/unit/git/agent-worktree-hygiene.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 511[2mms[22m[39m
     [33m[2m✓[22m[39m blocks ignored embedded agent worktree gitlinks that are forced into the index [33m 316[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 388[2mms[22m[39m
 [32m✓[39m test/unit/mcp/worktree-identity-canonicalization.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 426[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision-warp-slice-first.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 589[2mms[22m[39m
       [33m[2m✓[22m[39m returns SHA→tick map for indexed commits [33m 588[2mms[22m[39m
 [32m✓[39m test/unit/mcp/project-root-resolution.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 1051[2mms[22m[39m
     [33m[2m✓[22m[39m uses explicit projectRoot over GRAFT_PROJECT_ROOT env var [33m 580[2mms[22m[39m
     [33m[2m✓[22m[39m uses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided [33m 469[2mms[22m[39m
 [32m✓[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 83[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 123[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 206[2mms[22m[39m
 [32m✓[39m test/unit/adapters/rotating-ndjson-log.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m test/unit/method/backlog-dependency-dag.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-bad-code-burndown.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 470[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 412[2mms[22m[39m
 [32m✓[39m test/unit/ports/filesystem-contract.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m test/unit/mcp/path-resolver.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 44[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-status-cli.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 418[2mms[22m[39m
     [33m[2m✓[22m[39m lets an operator run graft daemon status --socket and see daemon health sessions workspace posture monitors scheduler pressure and worker pressure without raw JSON [33m 417[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt-builder.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/adapters/repo-paths-invariants.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m tests/playback/0092-daemon-session-directory-cleanup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-stdio-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m tests/playback/0089-logical-warp-writer-lanes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/operations/knowledge-map.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/sludge-detector.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v060-code-review-fixes.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/ports/warp-plumbing-conformance.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/mcp/secret-scrub.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/warp/context.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m tests/playback/0090-symbol-identity-and-rename-continuity.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_v070-structural-history.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/lang.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/operations/semantic-drift.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/metrics/metrics.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/context-guard.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/deterministic-replay.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/footprint-parallelism.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/agent-worktree-hygiene-gate.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/codec-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/projection-safety.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/operations/session-replay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/agent-handoff.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/warp/structural-drift-detection.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/warp/outline-diff-trailer.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 48907[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 9439[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 353[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative CLI peer outputs against the declared schemas [33m 38447[2mms[22m[39m
     [33m[2m✓[22m[39m validates local-history migration JSON output against the declared CLI schema [33m 460[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tool-call-footprint.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-paths.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/cli/daemon-status-model.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/ports/guards.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/operations/session-filtration.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/diff-identity.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/cli/daemon-status-render.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0093-structural-queries-use-query-builder.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/operations/capture-range.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/operations/adaptive-projection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/operations/teaching-hints.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/operations/horizon-of-readability.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/package-files-exist.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m tests/playback/0094-references-no-getEdges.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/cli/index-cmd.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m179 passed[39m[22m[90m (179)[39m
[2m      Tests [22m [1m[32m1371 passed[39m[22m[90m (1371)[39m
[2m   Start at [22m 10:30:17
[2m   Duration [22m 51.75s[2m (transform 7.24s, setup 0ms, import 43.00s, tests 391.17s, environment 14ms)[22m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 5 playback questions, 225 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift CORE_rewrite-structural-blame-to-use-warp-worldline-provenance`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift CORE_rewrite-structural-blame-to-use-warp-worldline-provenance
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
