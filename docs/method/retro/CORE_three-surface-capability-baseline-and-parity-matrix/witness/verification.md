---
title: "Verification Witness for Cycle 78"
---

# Verification Witness for Cycle 78

This witness proves that `three-surface capability baseline and parity matrix` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.5.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [31m❯[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 8[2mms[22m[39m
     [32m✓[39m Can a human explain the target layer map: contracts, application/use cases, ports, secondary adapters, and primary adapters/composition roots?[32m 2[2mms[22m[39m
     [32m✓[39m Can a human explain what must move out of `src/mcp/` and `src/cli/` versus what is allowed to stay at the edge?[32m 0[2mms[22m[39m
     [32m✓[39m Is it explicit why `ARCHITECTURE.md` currently overclaims strict hexagonal posture?[32m 0[2mms[22m[39m
     [32m✓[39m Is the next execution queue concrete enough to choose the next architecture slice without re-planning the whole repo?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet name the dependency rules tightly enough to enforce with tooling rather than taste?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet make the WARP boundary explicit as a first-class port/adaptor problem rather than a loose cast problem?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet map the major current hotspots (`server.ts`, `workspace-router.ts`, persisted local history, repo state, runtime observability, parser/operations hotspots) into migration slices instead of leaving them as a complaint list?[32m 0[2mms[22m[39m
[31m     [31m×[31m Does the packet turn the missing architecture slices into real backlog items with sequencing, not just prose?[39m[32m 5[2mms[22m[39m
 [31m❯[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 9629[2mms[22m[39m
[31m     [31m×[31m shares daemon-wide workspace authorization and bound session state across sessions on the same repo[39m[33m 5132[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 2782[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 1714[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 14779[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 1027[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 1566[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 3784[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1119[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1017[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 645[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 571[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 897[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 692[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1047[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 2222[2mms[22m[39m
 [32m✓[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 10347[2mms[22m[39m
     [33m[2m✓[22m[39m preserves safe_read cache behavior across off-process daemon execution [33m 3362[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 2349[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 4383[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 23758[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 2280[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 3657[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 963[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 661[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 724[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 862[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 1162[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 1444[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 2185[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 918[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 842[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 1718[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 897[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 1602[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 948[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 676[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 925[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 24830[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 3509[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 2120[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 1001[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 1252[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 1109[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 1214[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 1274[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 2399[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 2379[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 2167[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 2497[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 1295[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1292[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 1229[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 25369[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 2243[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 4101[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 1260[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1576[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 1239[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 1447[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 1918[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 1450[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 1573[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 2535[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 1312[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 949[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 1421[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 1275[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 1066[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 26600[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 2374[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 3552[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 988[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2460[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 1305[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 993[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 1090[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 1796[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 1525[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1412[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 1442[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 512[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1536[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1764[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1460[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 1305[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 9139[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 1024[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 1128[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 931[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 935[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1154[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 1185[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1560[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 1219[2mms[22m[39m
 [31m❯[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 30358[2mms[22m[39m
     [32m✓[39m declares an MCP output schema for every registered tool[32m 5[2mms[22m[39m
     [32m✓[39m exports JSON Schema objects for every MCP tool and CLI command[32m 107[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 14168[2mms[22m[39m
     [32m✓[39m validates init JSON output against the declared CLI schema[32m 82[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 487[2mms[22m[39m
[31m     [31m×[31m validates representative CLI peer outputs against the declared schemas[39m[33m 15039[2mms[22m[39m
     [33m[2m✓[22m[39m validates local-history migration JSON output against the declared CLI schema [33m 467[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 31243[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 6700[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 1118[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1375[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 835[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 1944[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 1418[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 1450[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 1204[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 2393[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 1679[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 2052[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1951[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 2340[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 4779[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6911[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 2025[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1398[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1594[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1891[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 9101[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1340[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 530[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1381[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 2641[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 835[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1689[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 391[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 7925[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1367[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1106[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 668[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 3189[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1591[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 35815[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 2504[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 3358[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 932[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 664[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 711[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 851[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 798[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 1024[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 1016[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 1172[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 1078[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 784[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 859[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 1874[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 2321[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 1094[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 853[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 1077[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 1021[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 1134[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 822[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 914[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 765[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 725[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 513[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 922[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 670[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 3350[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 955[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 20349[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 2067[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 1847[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 1358[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 1201[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 1429[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1630[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 1338[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 723[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 1258[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 1622[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 1465[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 1457[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 1648[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 1305[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4655[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 385[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 1077[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 488[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 559[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 412[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 399[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 419[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 377[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6839[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 2510[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1708[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2620[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5327[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 658[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 636[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read refuses binary files [33m 517[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 415[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 357[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 454[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 441[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7920[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1632[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 1183[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 957[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 1033[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 1785[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 1327[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 5022[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 827[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 827[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 1417[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 928[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 1021[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3103[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 561[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 440[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 311[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 384[2mms[22m[39m
     [33m[2m✓[22m[39m returns null for file that doesn't exist at ref [33m 379[2mms[22m[39m
 [32m✓[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 4315[2mms[22m[39m
     [33m[2m✓[22m[39m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries? [33m 3496[2mms[22m[39m
     [33m[2m✓[22m[39m Do current secondary adapters reject imports from primary adapters? [33m 348[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 5064[2mms[22m[39m
     [33m[2m✓[22m[39m Is `GitClient` async and backed by `@git-stunts/plumbing` instead of synchronous shell execution? [33m 349[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1917[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2760[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1759[2mms[22m[39m
     [33m[2m✓[22m[39m reports absent target-repo git transition hooks by default [33m 437[2mms[22m[39m
     [33m[2m✓[22m[39m recognizes installed graft target-repo hooks and narrows degradation honestly [33m 437[2mms[22m[39m
     [33m[2m✓[22m[39m promotes footing to hook-observed when an installed transition hook fires [33m 335[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 4874[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2853[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 2020[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 997[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 936[2mms[22m[39m
 [31m❯[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 16557[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1850[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1810[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1898[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 2521[2mms[22m[39m
[31m     [31m×[31m keeps governed-read behavior honest across hooks and safe_read[39m[33m 5026[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 3451[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 867[2mms[22m[39m
     [33m[2m✓[22m[39m installed target-repo git hooks append transition events when executed [33m 304[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2073[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 2071[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 431[2mms[22m[39m
     [33m[2m✓[22m[39m creates temp repos in the temp sandbox [33m 424[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 3431[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1645[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 1785[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 523[2mms[22m[39m
     [33m[2m✓[22m[39m runs Git commands through the async GitClient port [33m 522[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2948[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 2907[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 3504[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1263[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1076[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 1160[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 180[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 83[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 638[2mms[22m[39m
     [33m[2m✓[22m[39m git diff helpers use the async GitClient seam for changed files and file-at-ref lookup [33m 349[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 196[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 146[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 127[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 282[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 91[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 676[2mms[22m[39m
     [33m[2m✓[22m[39m applies graftignore policy on direct outline and range access [33m 393[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 91[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [31m❯[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 8[2mms[22m[39m
[31m     [31m×[31m recognizes TypeScript-family extensions[39m[32m 6[2mms[22m[39m
[31m     [31m×[31m recognizes JavaScript-family extensions[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns null for unsupported file types[32m 0[2mms[22m[39m
     [32m✓[39m recognizes markdown as a structured document format[32m 0[2mms[22m[39m
     [32m✓[39m returns null for unsupported structured formats[32m 0[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m83 passed[39m[22m[90m (88)[39m
[2m      Tests [22m [1m[31m6 failed[39m[22m[2m | [22m[1m[32m812 passed[39m[22m[90m (818)[39m
[2m   Start at [22m 13:47:19
[2m   Duration [22m 46.47s[2m (transform 5.94s, setup 0ms, import 27.94s, tests 369.20s, environment 8ms)[22m


[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 6 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts[2m > [22m0075 playback: hexagonal architecture convergence plan[2m > [22mDoes the packet turn the missing architecture slices into real backlog items with sequencing, not just prose?
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts:[2m101:64[22m[39m
    [90m 99|[39m
    [90m100|[39m     [35mfor[39m ([35mconst[39m relativePath [35mof[39m backlogPaths) {
    [90m101|[39m       expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(tr…
    [90m   |[39m                                                                [31m^[39m
    [90m102|[39m       [34mexpect[39m(designDoc)[33m.[39m[34mtoContain[39m(path[33m.[39m[34mbasename[39m(relativePath))[33m;[39m
    [90m103|[39m     }

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/contracts/output-schemas.test.ts[2m > [22mcontracts: output schemas[2m > [22mvalidates representative CLI peer outputs against the declared schemas
[31m[1mError[22m: Test timed out in 15000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/contracts/output-schemas.test.ts:[2m228:3[22m[39m
    [90m226|[39m   })[33m;[39m
    [90m227|[39m
    [90m228|[39m   it("validates representative CLI peer outputs against the declared s…
    [90m   |[39m   [31m^[39m
    [90m229|[39m     [35mconst[39m repoDir [33m=[39m [34mcreateTestRepo[39m([32m"graft-output-schema-cli-peer-"[39m)[33m;[39m
    [90m230|[39m     cleanups[33m.[39m[34mpush[39m(repoDir)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/mcp/daemon-multi-session.test.ts[2m > [22mmcp: in-process daemon shared sessions[2m > [22mshares daemon-wide workspace authorization and bound session state across sessions on the same repo
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/mcp/daemon-multi-session.test.ts:[2m25:3[22m[39m
    [90m 23|[39m
    [90m 24|[39m [34mdescribe[39m([32m"mcp: in-process daemon shared sessions"[39m[33m,[39m () [33m=>[39m {
    [90m 25|[39m   it("shares daemon-wide workspace authorization and bound session sta…
    [90m   |[39m   [31m^[39m
    [90m 26|[39m     [35mconst[39m repoDir [33m=[39m [34mcreateCommittedRepo[39m([32m"graft-daemon-shared-auth-"[39m)[33m;[39m
    [90m 27|[39m     fs[33m.[39m[34mwriteFileSync[39m(path[33m.[39m[34mjoin[39m(repoDir[33m,[39m [32m"app.ts"[39m)[33m,[39m [

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/parser/lang.test.ts[2m > [22mparser: detectLang[2m > [22mrecognizes TypeScript-family extensions
[31m[1mAssertionError[22m: expected 'tsx' to be 'ts' // Object.is equality[39m

Expected: [32m"ts"[39m
Received: [31m"ts[7mx[27m"[39m

[36m [2m❯[22m test/unit/parser/lang.test.ts:[2m7:45[22m[39m
    [90m  5|[39m   [34mit[39m([32m"recognizes TypeScript-family extensions"[39m[33m,[39m () [33m=>[39m {
    [90m  6|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/index.ts"[39m))[33m.[39m[34mtoBe[39m([32m"ts"[39m)[33m;[39m
    [90m  7|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/component.tsx"[39m))[33m.[39m[34mtoBe[39m([32m"ts"[39m)[33m;[39m
    [90m   |[39m                                             [31m^[39m
    [90m  8|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/module.mts"[39m))[33m.[39m[34mtoBe[39m([32m"ts"[39m)[33m;[39m
    [90m  9|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/module.cts"[39m))[33m.[39m[34mtoBe[39m([32m"ts"[39m)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/parser/lang.test.ts[2m > [22mparser: detectLang[2m > [22mrecognizes JavaScript-family extensions
[31m[1mAssertionError[22m: expected 'tsx' to be 'js' // Object.is equality[39m

Expected: [32m"js"[39m
Received: [31m"tsx"[39m

[36m [2m❯[22m test/unit/parser/lang.test.ts:[2m14:45[22m[39m
    [90m 12|[39m   [34mit[39m([32m"recognizes JavaScript-family extensions"[39m[33m,[39m () [33m=>[39m {
    [90m 13|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/index.js"[39m))[33m.[39m[34mtoBe[39m([32m"js"[39m)[33m;[39m
    [90m 14|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/component.jsx"[39m))[33m.[39m[34mtoBe[39m([32m"js"[39m)[33m;[39m
    [90m   |[39m                                             [31m^[39m
    [90m 15|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/module.mjs"[39m))[33m.[39m[34mtoBe[39m([32m"js"[39m)[33m;[39m
    [90m 16|[39m     [34mexpect[39m([34mdetectLang[39m([32m"src/module.cjs"[39m))[33m.[39m[34mtoBe[39m([32m"js"[39m)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/policy/cross-surface-parity.test.ts[2m > [22mpolicy: cross-surface parity[2m > [22mkeeps governed-read behavior honest across hooks and safe_read
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/policy/cross-surface-parity.test.ts:[2m155:3[22m[39m
    [90m153|[39m   })[33m;[39m
    [90m154|[39m
    [90m155|[39m   it("keeps governed-read behavior honest across hooks and safe_read",…
    [90m   |[39m   [31m^[39m
    [90m156|[39m     [35mconst[39m repoDir [33m=[39m [34mcreateTestRepo[39m([32m"graft-policy-parity-soft-"[39m)[33m;[39m
    [90m157|[39m     cleanups[33m.[39m[34mpush[39m(repoDir)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯[22m[39m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 6 playback questions, 118 test descriptions.
Search basis: exact normalized match in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Manual Verification

- [x] Automated capture completed successfully.
