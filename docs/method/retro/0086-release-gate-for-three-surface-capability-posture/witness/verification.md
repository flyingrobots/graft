---
title: "Verification Witness for Cycle 86"
---

# Verification Witness for Cycle 86

This witness proves that `release gate for three-surface capability posture` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.5.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.2 [39m[90m.[39m

 [31m❯[39m tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 7[2mms[22m[39m
     [32m✓[39m Can a human explain the target layer map: contracts, application/use cases, ports, secondary adapters, and primary adapters/composition roots?[32m 1[2mms[22m[39m
     [32m✓[39m Can a human explain what must move out of `src/mcp/` and `src/cli/` versus what is allowed to stay at the edge?[32m 0[2mms[22m[39m
     [32m✓[39m Is it explicit why `ARCHITECTURE.md` currently overclaims strict hexagonal posture?[32m 0[2mms[22m[39m
     [32m✓[39m Is the next execution queue concrete enough to choose the next architecture slice without re-planning the whole repo?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet name the dependency rules tightly enough to enforce with tooling rather than taste?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet make the WARP boundary explicit as a first-class port/adaptor problem rather than a loose cast problem?[32m 0[2mms[22m[39m
     [32m✓[39m Does the packet map the major current hotspots (`server.ts`, `workspace-router.ts`, persisted local history, repo state, runtime observability, parser/operations hotspots) into migration slices instead of leaving them as a complaint list?[32m 0[2mms[22m[39m
[31m     [31m×[31m Does the packet turn the missing architecture slices into real backlog items with sequencing, not just prose?[39m[32m 4[2mms[22m[39m
 [31m❯[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 7[2mms[22m[39m
[31m     [31m×[31m recognizes TypeScript-family extensions[39m[32m 4[2mms[22m[39m
[31m     [31m×[31m recognizes JavaScript-family extensions[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns null for unsupported file types[32m 0[2mms[22m[39m
     [32m✓[39m recognizes markdown as a structured document format[32m 0[2mms[22m[39m
     [32m✓[39m returns null for unsupported structured formats[32m 0[2mms[22m[39m
 [31m❯[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 9557[2mms[22m[39m
     [32m✓[39m Can a human point to the currently enforced layers without having to infer them from code archaeology?[32m 6[2mms[22m[39m
     [32m✓[39m Is it explicit that this cycle enforces a truthful first-cut map, not a final directory reorganization?[32m 2[2mms[22m[39m
     [32m✓[39m Does `ARCHITECTURE.md` stop claiming the repo is already strict hexagonal in full?[32m 2[2mms[22m[39m
[31m     [31m×[31m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?[39m[33m 8362[2mms[22m[39m
     [32m✓[39m Do ports reject imports from application modules, adapters, primary adapters, and host libraries?[32m 287[2mms[22m[39m
     [32m✓[39m Do current application modules reject direct adapter and host imports?[32m 266[2mms[22m[39m
     [33m[2m✓[22m[39m Do current secondary adapters reject imports from primary adapters? [33m 312[2mms[22m[39m
     [32m✓[39m Does the playback witness prove the guardrails by linting synthetic violations rather than relying on prose claims?[32m 156[2mms[22m[39m
     [32m✓[39m still allows application modules to depend on ports[32m 162[2mms[22m[39m
 [31m❯[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 10954[2mms[22m[39m
[31m     [31m×[31m shares daemon-wide workspace authorization and bound session state across sessions on the same repo[39m[33m 5067[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 3205[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 2673[2mms[22m[39m
 [31m❯[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 13773[2mms[22m[39m
     [32m✓[39m starts on a local socket, reports health, and closes sessions[32m 138[2mms[22m[39m
[31m     [31m×[31m preserves safe_read cache behavior across off-process daemon execution[39m[33m 5149[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 3220[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 5263[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 24572[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 3248[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 2324[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 1092[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 1726[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 1232[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 2115[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 1129[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 1960[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 2131[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 1898[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 2233[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 1245[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1109[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 1034[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 24782[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 2478[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 3817[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 1463[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 1914[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 2062[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 1134[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 1585[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 1264[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 1334[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 2086[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 1326[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 941[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 1189[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 1215[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 973[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 25453[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 2218[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 3487[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1145[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 2856[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 2115[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 817[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 1199[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 1058[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 1064[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 1133[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1020[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 1458[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 456[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1612[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1586[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1218[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 1006[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 14343[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1622[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1493[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1681[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1914[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 5086[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 2546[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 20156[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 1294[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 1573[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 821[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 1062[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 744[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 868[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 1401[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 1248[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 1848[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 977[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 702[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 1231[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 691[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 1124[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 1107[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 982[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 1164[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 1020[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 30730[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 6588[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 1395[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1638[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 1483[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 1972[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 1287[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 1072[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 1179[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1613[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 1751[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 2022[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1651[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 2237[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 4826[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 18801[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 1983[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 1204[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 1394[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 1211[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 1627[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1711[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 982[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 712[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 1009[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 1374[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 1300[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 1151[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 1666[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 1474[2mms[22m[39m
 [31m❯[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 31067[2mms[22m[39m
     [32m✓[39m declares an MCP output schema for every registered tool[32m 3[2mms[22m[39m
     [32m✓[39m exports JSON Schema objects for every MCP tool and CLI command[32m 129[2mms[22m[39m
     [32m✓[39m preserves concrete CLI output types through the helper stack[32m 4[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 14795[2mms[22m[39m
     [32m✓[39m validates init JSON output against the declared CLI schema[32m 104[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 518[2mms[22m[39m
[31m     [31m×[31m validates representative CLI peer outputs against the declared schemas[39m[33m 15045[2mms[22m[39m
     [33m[2m✓[22m[39m validates local-history migration JSON output against the declared CLI schema [33m 468[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 35319[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 2675[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 3083[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 1110[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 755[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 1014[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 877[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 1481[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 1096[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 921[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 991[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 675[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 745[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 755[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 1410[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 2025[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 810[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 1077[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 682[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 965[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 921[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 924[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 1068[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 903[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 557[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 551[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 638[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 594[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 3664[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 1124[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 9280[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1655[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 527[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1239[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 2902[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 1164[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1139[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 325[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 10234[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 1230[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 1218[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1130[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 1009[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1094[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 1479[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1868[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 1201[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 6821[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 1783[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 1684[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1773[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1579[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 8586[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1233[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 1479[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 1452[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 1111[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 1506[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 1796[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 6103[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 727[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 660[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read refuses binary files [33m 337[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 500[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 672[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 469[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 337[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 13683[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 872[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 834[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1362[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1110[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1161[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 755[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 760[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1585[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 1049[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1363[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 2686[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 7947[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 2609[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 2471[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2863[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 9931[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1592[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1569[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 470[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 3934[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 2360[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 5273[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 2284[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2739[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 5578[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 3662[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1915[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3486[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 321[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 332[2mms[22m[39m
     [33m[2m✓[22m[39m lists added files [33m 398[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 572[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty array when no changes [33m 594[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 347[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getChangedFiles [33m 405[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 3235[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 1157[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1118[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 959[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 6264[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 471[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 971[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 536[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 912[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 343[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 688[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 882[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 512[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 655[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 6501[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 1505[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 1169[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 1241[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 1315[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 1270[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2927[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1594[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 1332[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 191[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 405[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 933[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 870[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 608[2mms[22m[39m
 [32m✓[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3768[2mms[22m[39m
     [33m[2m✓[22m[39m Can an external app create a repo-local workspace and call direct governed read methods without going through MCP receipts? [33m 423[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 3340[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1077[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 129[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 140[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 181[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 108[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 110[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1395[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 1384[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 239[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1893[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1810[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 631[2mms[22m[39m
     [33m[2m✓[22m[39m applies graftignore policy on direct outline and range access [33m 384[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 127[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 52[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 116[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 43[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 74[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/release/three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[31m6 failed[39m[22m[2m | [22m[1m[32m94 passed[39m[22m[90m (100)[39m
[2m      Tests [22m [1m[31m7 failed[39m[22m[2m | [22m[1m[32m868 passed[39m[22m[90m (875)[39m
[2m   Start at [22m 05:22:04
[2m   Duration [22m 48.62s[2m (transform 7.98s, setup 0ms, import 36.20s, tests 378.09s, environment 8ms)[22m


[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 7 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/7]⎯[22m[39m

[41m[1m FAIL [22m[49m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts[2m > [22m0076 hex layer map and dependency guardrails[2m > [22mDo contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts:[2m64:3[22m[39m
    [90m 62|[39m   })[33m;[39m
    [90m 63|[39m
    [90m 64|[39m   it("Do contracts and pure helpers reject imports from ports, applica…
    [90m   |[39m   [31m^[39m
    [90m 65|[39m     [35mconst[39m messages [33m=[39m [35mawait[39m [34mlintRestrictedImports[39m(
    [90m 66|[39m       [32m'import { createGraftServer } from "../mcp/server.js";\n'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/7]⎯[22m[39m

[41m[1m FAIL [22m[49m test/unit/contracts/output-schemas.test.ts[2m > [22mcontracts: output schemas[2m > [22mvalidates representative CLI peer outputs against the declared schemas
[31m[1mError[22m: Test timed out in 15000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/unit/contracts/output-schemas.test.ts:[2m253:3[22m[39m
    [90m251|[39m   })[33m;[39m
    [90m252|[39m
    [90m253|[39m   it("validates representative CLI peer outputs against the declared s…
    [90m   |[39m   [31m^[39m
    [90m254|[39m     [35mconst[39m repoDir [33m=[39m [34mcreateTestRepo[39m([32m"graft-output-schema-cli-peer-"[39m)[33m;[39m
    [90m255|[39m     cleanups[33m.[39m[34mpush[39m(repoDir)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/7]⎯[22m[39m

[41m[1m FAIL [22m[49m test/integration/mcp/daemon-server.test.ts[2m > [22mmcp: daemon transport and lifecycle[2m > [22mpreserves safe_read cache behavior across off-process daemon execution
[31m[1mError[22m: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".[39m
[36m [2m❯[22m test/integration/mcp/daemon-server.test.ts:[2m233:3[22m[39m
    [90m231|[39m
    [90m232|[39m
    [90m233|[39m   it("preserves safe_read cache behavior across off-process daemon exe…
    [90m   |[39m   [31m^[39m
    [90m234|[39m     [35mconst[39m repoDir [33m=[39m [34mcreateTestRepo[39m([32m"graft-daemon-safe-read-"[39m)[33m;[39m
    [90m235|[39m     repos[33m.[39m[34mpush[39m(repoDir)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/7]⎯[22m[39m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 3 playback questions, 159 test descriptions.
Search basis: exact normalized match in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Manual Verification

- [x] Automated capture completed successfully.
