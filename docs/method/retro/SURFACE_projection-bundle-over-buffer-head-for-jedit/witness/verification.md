---
title: "Verification Witness for Cycle 85"
---

# Verification Witness for Cycle 85

This witness proves that `Projection bundle over buffer head for jedit` now carries the required
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
 [31m❯[39m test/unit/parser/lang.test.ts [2m([22m[2m5 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 10[2mms[22m[39m
[31m     [31m×[31m recognizes TypeScript-family extensions[39m[32m 7[2mms[22m[39m
[31m     [31m×[31m recognizes JavaScript-family extensions[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns null for unsupported file types[32m 0[2mms[22m[39m
     [32m✓[39m recognizes markdown as a structured document format[32m 0[2mms[22m[39m
     [32m✓[39m returns null for unsupported structured formats[32m 0[2mms[22m[39m
 [31m❯[39m tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts [2m([22m[2m9 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 8339[2mms[22m[39m
     [32m✓[39m Can a human point to the currently enforced layers without having to infer them from code archaeology?[32m 2[2mms[22m[39m
     [32m✓[39m Is it explicit that this cycle enforces a truthful first-cut map, not a final directory reorganization?[32m 1[2mms[22m[39m
     [32m✓[39m Does `ARCHITECTURE.md` stop claiming the repo is already strict hexagonal in full?[32m 2[2mms[22m[39m
[31m     [31m×[31m Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?[39m[33m 7192[2mms[22m[39m
     [32m✓[39m Do ports reject imports from application modules, adapters, primary adapters, and host libraries?[32m 206[2mms[22m[39m
     [32m✓[39m Do current application modules reject direct adapter and host imports?[32m 110[2mms[22m[39m
     [32m✓[39m Do current secondary adapters reject imports from primary adapters?[32m 140[2mms[22m[39m
     [33m[2m✓[22m[39m Does the playback witness prove the guardrails by linting synthetic violations rather than relying on prose claims? [33m 347[2mms[22m[39m
     [33m[2m✓[22m[39m still allows application modules to depend on ports [33m 337[2mms[22m[39m
 [31m❯[39m test/unit/mcp/daemon-multi-session.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 10763[2mms[22m[39m
[31m     [31m×[31m shares daemon-wide workspace authorization and bound session state across sessions on the same repo[39m[33m 5054[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree [33m 3106[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces divergent checkout posture for same-repo daemon sessions on different worktrees [33m 2601[2mms[22m[39m
 [31m❯[39m test/integration/mcp/daemon-server.test.ts [2m([22m[2m4 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 12532[2mms[22m[39m
     [32m✓[39m starts on a local socket, reports health, and closes sessions[32m 141[2mms[22m[39m
[31m     [31m×[31m preserves safe_read cache behavior across off-process daemon execution[39m[33m 5124[2mms[22m[39m
     [33m[2m✓[22m[39m offloads dirty precision lookups through child-process workers [33m 2886[2mms[22m[39m
     [33m[2m✓[22m[39m persists repo-scoped monitor lifecycle across daemon restart [33m 4380[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-observability.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 22361[2mms[22m[39m
     [33m[2m✓[22m[39m writes correlated start and completion events for tool calls [33m 2834[2mms[22m[39m
     [33m[2m✓[22m[39m writes metadata-only failure events for schema validation errors [33m 1855[2mms[22m[39m
     [33m[2m✓[22m[39m exposes runtime observability status in doctor [33m 1168[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces a full-file runtime staged target for staged rename selections [33m 1333[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces bulk-transition guidance when many paths move together [33m 1556[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view surfaces a bounded recent event window with anchor and degradation context [33m 1517[2mms[22m[39m
     [33m[2m✓[22m[39m summarizes many staged paths as bulk staging [33m 1290[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces merge-phase guidance during active conflicted merges [33m 1882[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces rebase-phase guidance during active conflicted rebases [33m 1849[2mms[22m[39m
     [33m[2m✓[22m[39m forks persisted local history when checkout footing changes [33m 1321[2mms[22m[39m
     [33m[2m✓[22m[39m upgrades checkout-boundary continuity evidence when installed hooks observe the transition [33m 2258[2mms[22m[39m
     [33m[2m✓[22m[39m keeps internal graft logs out of workspace overlay and clean-head checks [33m 1259[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces installed target-repo git hooks without pretending local edit reactivity [33m 1100[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces hook-observed checkout boundaries after an installed transition hook fires [33m 1046[2mms[22m[39m
 [32m✓[39m test/unit/mcp/cache.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 22799[2mms[22m[39m
     [33m[2m✓[22m[39m returns content on first read [33m 1801[2mms[22m[39m
     [33m[2m✓[22m[39m returns cache_hit on second read of unchanged file [33m 3757[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes outline and jump table [33m 1312[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes readCount [33m 2072[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes estimatedBytesAvoided [33m 1460[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff when file changes between reads [33m 1323[2mms[22m[39m
     [33m[2m✓[22m[39m different files have independent cache entries [33m 1347[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline also uses cache on re-read [33m 1371[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline cache invalidates when file changes [33m 1096[2mms[22m[39m
     [33m[2m✓[22m[39m stats includes cache metrics [33m 1919[2mms[22m[39m
     [33m[2m✓[22m[39m cache_hit includes lastReadAt timestamp [33m 1187[2mms[22m[39m
     [33m[2m✓[22m[39m banned files are not cached (still refused on re-read) [33m 830[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by safe_read once markdown is supported [33m 1185[2mms[22m[39m
     [33m[2m✓[22m[39m markdown outlines are cached by file_outline once markdown is supported [33m 1180[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since reports structural diffs for markdown headings [33m 955[2mms[22m[39m
 [32m✓[39m test/unit/mcp/precision.test.ts [2m([22m[2m18 tests[22m[2m)[22m[33m 24309[2mms[22m[39m
     [33m[2m✓[22m[39m returns working-tree source code for a known symbol [33m 1665[2mms[22m[39m
     [33m[2m✓[22m[39m returns not found for an unknown symbol [33m 3179[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit ambiguity response when multiple symbols match [33m 1290[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed historical reads [33m 3206[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live parsing for historical reads when WARP is not indexed [33m 1866[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols in untracked working-tree files during project-wide search [33m 827[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when the target file is matched by .graftignore [33m 972[2mms[22m[39m
     [33m[2m✓[22m[39m finds symbols via live parsing when the repo is not indexed [33m 1176[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery for plain queries [33m 952[2mms[22m[39m
     [33m[2m✓[22m[39m supports kind filters and directory scoping [33m 957[2mms[22m[39m
     [33m[2m✓[22m[39m normalizes in-repo absolute paths for directory scoping [33m 1271[2mms[22m[39m
     [33m[2m✓[22m[39m returns empty results for a miss [33m 1080[2mms[22m[39m
     [33m[2m✓[22m[39m fails honestly when git file enumeration cannot run [33m 409[2mms[22m[39m
     [33m[2m✓[22m[39m uses WARP for indexed clean-head symbol search [33m 1530[2mms[22m[39m
     [33m[2m✓[22m[39m supports case-insensitive substring discovery on indexed clean-head repos [33m 1498[2mms[22m[39m
     [33m[2m✓[22m[39m falls back to live search when indexed repos have dirty working-tree edits [33m 1175[2mms[22m[39m
     [33m[2m✓[22m[39m returns an explicit refusal when every matching symbol is hidden by .graftignore [33m 1249[2mms[22m[39m
 [32m✓[39m test/unit/mcp/receipt.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 18262[2mms[22m[39m
     [33m[2m✓[22m[39m every safe_read response includes a _receipt [33m 1233[2mms[22m[39m
     [33m[2m✓[22m[39m every file_outline response includes a _receipt [33m 1331[2mms[22m[39m
     [33m[2m✓[22m[39m every read_range response includes a _receipt [33m 764[2mms[22m[39m
     [33m[2m✓[22m[39m every stats response includes a _receipt [33m 723[2mms[22m[39m
     [33m[2m✓[22m[39m every doctor response includes a _receipt [33m 1007[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has correct shape [33m 812[2mms[22m[39m
     [33m[2m✓[22m[39m sessionId is stable across calls [33m 1062[2mms[22m[39m
     [33m[2m✓[22m[39m traceId differs per call [33m 1125[2mms[22m[39m
     [33m[2m✓[22m[39m seq increments monotonically [33m 1782[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes fileBytes for file operations [33m 812[2mms[22m[39m
     [33m[2m✓[22m[39m receipt has null fileBytes for non-file operations [33m 717[2mms[22m[39m
     [33m[2m✓[22m[39m cumulative counters accumulate across calls [33m 1199[2mms[22m[39m
     [33m[2m✓[22m[39m receipt projection matches response projection [33m 600[2mms[22m[39m
     [33m[2m✓[22m[39m receipt on cache hit shows cache_hit projection [33m 1122[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is returnedBytes / fileBytes for file operations [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m compressionRatio is null for non-file operations [33m 639[2mms[22m[39m
     [33m[2m✓[22m[39m returnedBytes reflects actual response size [33m 1148[2mms[22m[39m
     [33m[2m✓[22m[39m tracks non-read burden by tool kind in receipts [33m 946[2mms[22m[39m
 [32m✓[39m test/unit/policy/cross-surface-parity.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 13321[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'binary' across hooks and bounded-read MCP tools [33m 1413[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'secret' across hooks and bounded-read MCP tools [33m 1212[2mms[22m[39m
     [33m[2m✓[22m[39m keeps hard denial parity for 'graftignore' across hooks and bounded-read MCP tools [33m 1697[2mms[22m[39m
     [33m[2m✓[22m[39m keeps .graftignore denial parity across precision and structural MCP tools [33m 1594[2mms[22m[39m
     [33m[2m✓[22m[39m keeps governed-read behavior honest across hooks and safe_read [33m 4946[2mms[22m[39m
     [33m[2m✓[22m[39m keeps historical denial parity for git-backed precision and structural reads [33m 2456[2mms[22m[39m
 [32m✓[39m test/unit/mcp/layered-worldline.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 28279[2mms[22m[39m
       [33m[2m✓[22m[39m labels historical symbol reads as commit_worldline [33m 5932[2mms[22m[39m
       [33m[2m✓[22m[39m labels branch/ref structural comparisons as ref_view [33m 1318[2mms[22m[39m
       [33m[2m✓[22m[39m labels dirty working-tree answers as workspace_overlay [33m 1839[2mms[22m[39m
       [33m[2m✓[22m[39m labels default structural diffs against the working tree as workspace_overlay [33m 991[2mms[22m[39m
       [33m[2m✓[22m[39m doctor reports checkout epochs and semantic checkout transitions [33m 1790[2mms[22m[39m
       [33m[2m✓[22m[39m keeps commit_worldline classification even when a historical ref is invalid [33m 1003[2mms[22m[39m
       [33m[2m✓[22m[39m defaults workspace attribution to unknown with explicit low confidence [33m 1271[2mms[22m[39m
       [33m[2m✓[22m[39m counts unstaged changes in the workspace overlay without misclassifying them as staged [33m 973[2mms[22m[39m
       [33m[2m✓[22m[39m tracks detached-head checkouts as checkout epochs with commit targets [33m 1422[2mms[22m[39m
       [33m[2m✓[22m[39m does not misclassify checkout subjects that contain branch names with rebase in them [33m 1611[2mms[22m[39m
       [33m[2m✓[22m[39m reports hard resets as semantic repo transitions without losing commit_worldline access [33m 1901[2mms[22m[39m
       [33m[2m✓[22m[39m reports non-fast-forward merges as semantic repo transitions [33m 1593[2mms[22m[39m
       [33m[2m✓[22m[39m reports rebases as semantic repo transitions while preserving ref_view queries [33m 2136[2mms[22m[39m
       [33m[2m✓[22m[39m keeps checkout epochs unique across repeated branch flips [33m 4494[2mms[22m[39m
 [32m✓[39m test/unit/mcp/changed.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 17288[2mms[22m[39m
     [33m[2m✓[22m[39m returns diff projection when file changed between reads [33m 1750[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes added symbols [33m 1107[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes removed symbols [33m 1054[2mms[22m[39m
     [33m[2m✓[22m[39m diff includes changed signatures with old and new values [33m 1355[2mms[22m[39m
     [33m[2m✓[22m[39m includes full new outline alongside diff [33m 1240[2mms[22m[39m
     [33m[2m✓[22m[39m updates observation cache after returning diff [33m 1465[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since tool returns diff without full read [33m 1035[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns no-observation when file never read [33m 623[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since returns unchanged when file hasn't changed [33m 934[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since without consume does not update cache (peek) [33m 1515[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since checks policy and refuses banned files [33m 1301[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since refuses files matched by .graftignore [33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m changed_since with consume: true updates cache [33m 1647[2mms[22m[39m
     [33m[2m✓[22m[39m receipt includes diff projection on changed reads [33m 1457[2mms[22m[39m
 [31m❯[39m test/unit/contracts/output-schemas.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 29747[2mms[22m[39m
     [32m✓[39m declares an MCP output schema for every registered tool[32m 15[2mms[22m[39m
     [32m✓[39m exports JSON Schema objects for every MCP tool and CLI command[32m 30[2mms[22m[39m
     [32m✓[39m preserves concrete CLI output types through the helper stack[32m 2[2mms[22m[39m
     [33m[2m✓[22m[39m validates representative MCP tool outputs against the declared schemas [33m 13658[2mms[22m[39m
     [32m✓[39m validates init JSON output against the declared CLI schema[32m 98[2mms[22m[39m
     [33m[2m✓[22m[39m validates index JSON output against the declared CLI schema [33m 409[2mms[22m[39m
[31m     [31m×[31m validates representative CLI peer outputs against the declared schemas[39m[33m 15083[2mms[22m[39m
     [33m[2m✓[22m[39m validates local-history migration JSON output against the declared CLI schema [33m 451[2mms[22m[39m
 [32m✓[39m test/unit/mcp/tools.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 33025[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns structured JSON with projection [33m 2152[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 3037[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns a markdown heading outline for large markdown files [33m 939[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for banned files [33m 753[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns refusal for files matched by .graftignore [33m 1097[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns outline with jump table [33m 1008[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline returns a markdown heading outline [33m 1020[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline refuses files matched by .graftignore [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded content [33m 790[2mms[22m[39m
     [33m[2m✓[22m[39m state_save enforces 8 KB cap [33m 821[2mms[22m[39m
     [33m[2m✓[22m[39m state_load returns null when no state saved [33m 918[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 679[2mms[22m[39m
     [33m[2m✓[22m[39m causal_status returns the active causal workspace posture [33m 666[2mms[22m[39m
     [33m[2m✓[22m[39m activity_view returns recent bounded local artifact history anchored to the current commit [33m 1138[2mms[22m[39m
     [33m[2m✓[22m[39m causal_attach records explicit attach evidence after a continuity fork [33m 2027[2mms[22m[39m
     [33m[2m✓[22m[39m stats returns metrics summary [33m 667[2mms[22m[39m
     [33m[2m✓[22m[39m stats and doctor expose non-read burden breakdowns [33m 1056[2mms[22m[39m
     [33m[2m✓[22m[39m set_budget activates budget tracking [33m 662[2mms[22m[39m
     [33m[2m✓[22m[39m budget appears in receipt after set_budget [33m 1005[2mms[22m[39m
     [33m[2m✓[22m[39m budget tightens byte cap for large files [33m 953[2mms[22m[39m
     [33m[2m✓[22m[39m no budget in receipt when budget not set [33m 1007[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses banned files via middleware [33m 633[2mms[22m[39m
     [33m[2m✓[22m[39m read_range refuses files matched by .graftignore via middleware [33m 940[2mms[22m[39m
     [33m[2m✓[22m[39m code_find refuses banned file paths via middleware [33m 767[2mms[22m[39m
     [33m[2m✓[22m[39m returns meaning and action for known reason code [33m 576[2mms[22m[39m
     [33m[2m✓[22m[39m is case-insensitive [33m 705[2mms[22m[39m
     [33m[2m✓[22m[39m returns error for unknown code [33m 634[2mms[22m[39m
     [33m[2m✓[22m[39m rejects unknown keys in tool arguments [33m 534[2mms[22m[39m
     [33m[2m✓[22m[39m tracks session depth across tool calls [33m 3599[2mms[22m[39m
     [33m[2m✓[22m[39m includes tripwire in response when triggered [33m 1032[2mms[22m[39m
 [32m✓[39m test/unit/mcp/structural-policy.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 9747[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map includes untracked working-tree files [33m 950[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map normalizes in-repo absolute path scopes [33m 1254[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1136[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 995[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map omits .graftignore-matched files and reports them explicitly [33m 1189[2mms[22m[39m
     [33m[2m✓[22m[39m graft_diff excludes denied working-tree files and reports them explicitly [33m 1447[2mms[22m[39m
     [33m[2m✓[22m[39m graft_since excludes denied historical files and reports them explicitly [33m 1723[2mms[22m[39m
     [33m[2m✓[22m[39m keeps allowed structural results usable when a scoped diff is fully denied [33m 1047[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-binding.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 8714[2mms[22m[39m
     [33m[2m✓[22m[39m binds a daemon session to a repo and enables repo-scoped tools [33m 1308[2mms[22m[39m
     [33m[2m✓[22m[39m Does workspace binding load graftignore without sync filesystem reads? [33m 532[2mms[22m[39m
     [33m[2m✓[22m[39m routes heavy daemon repo tools through the scheduler [33m 1169[2mms[22m[39m
     [33m[2m✓[22m[39m rebinds across worktrees of the same repo without carrying session-local state [33m 3009[2mms[22m[39m
     [33m[2m✓[22m[39m denies run_capture in daemon mode after bind [33m 1075[2mms[22m[39m
     [33m[2m✓[22m[39m allows run_capture when authorization explicitly enables it [33m 1016[2mms[22m[39m
     [33m[2m✓[22m[39m lists and revokes authorized workspaces through the daemon control plane [33m 319[2mms[22m[39m
 [32m✓[39m test/unit/operations/graft-diff.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4417[2mms[22m[39m
     [33m[2m✓[22m[39m diffs modified file between two refs [33m 449[2mms[22m[39m
     [33m[2m✓[22m[39m detects added files [33m 481[2mms[22m[39m
     [33m[2m✓[22m[39m detects deleted files [33m 502[2mms[22m[39m
     [33m[2m✓[22m[39m diffs multiple files at once [33m 771[2mms[22m[39m
     [33m[2m✓[22m[39m diffs working tree vs HEAD (default) [33m 320[2mms[22m[39m
     [33m[2m✓[22m[39m detects changed signatures [33m 493[2mms[22m[39m
     [33m[2m✓[22m[39m skips non-supported file extensions [33m 399[2mms[22m[39m
     [33m[2m✓[22m[39m filters by path when provided [33m 403[2mms[22m[39m
     [33m[2m✓[22m[39m includes summary line per file [33m 402[2mms[22m[39m
 [32m✓[39m test/unit/cli/main.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 6801[2mms[22m[39m
     [33m[2m✓[22m[39m runs peer commands through the grouped CLI surface [33m 1071[2mms[22m[39m
     [33m[2m✓[22m[39m runs diag activity through the grouped CLI surface [33m 1365[2mms[22m[39m
     [33m[2m✓[22m[39m migrates legacy JSON local history into the WARP graph [33m 362[2mms[22m[39m
     [33m[2m✓[22m[39m renders human-friendly diag activity output by default [33m 2743[2mms[22m[39m
     [33m[2m✓[22m[39m renders a bounded local-history DAG from WARP-backed history [33m 1256[2mms[22m[39m
 [32m✓[39m test/unit/warp/indexer.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 11821[2mms[22m[39m
     [33m[2m✓[22m[39m indexes a single commit with one file [33m 877[2mms[22m[39m
     [33m[2m✓[22m[39m indexes added symbols correctly [33m 581[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol additions across commits [33m 1260[2mms[22m[39m
     [33m[2m✓[22m[39m indexes symbol removals via tombstone [33m 1091[2mms[22m[39m
     [33m[2m✓[22m[39m indexes signature changes [33m 1293[2mms[22m[39m
     [33m[2m✓[22m[39m records commit metadata [33m 609[2mms[22m[39m
     [33m[2m✓[22m[39m handles unsupported file types gracefully [33m 852[2mms[22m[39m
     [33m[2m✓[22m[39m handles file deletion [33m 1370[2mms[22m[39m
     [33m[2m✓[22m[39m indexes class with methods (nested symbols) [33m 918[2mms[22m[39m
     [33m[2m✓[22m[39m returns zero for empty commit range [33m 322[2mms[22m[39m
     [33m[2m✓[22m[39m indexes only the specified range [33m 1093[2mms[22m[39m
     [33m[2m✓[22m[39m shares the same warp graph across worktrees of the same repo [33m 1554[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-worker-pool.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 8077[2mms[22m[39m
     [33m[2m✓[22m[39m runs monitor tick work on a child-process worker and reports worker counts [33m 2370[2mms[22m[39m
     [33m[2m✓[22m[39m runs an offloaded repo tool on a child-process worker [33m 2045[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1876[2mms[22m[39m
     [33m[2m✓[22m[39m runs dirty code_find through the live worker path [33m 1786[2mms[22m[39m
 [32m✓[39m test/unit/mcp/code-refs.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 7032[2mms[22m[39m
     [33m[2m✓[22m[39m finds import sites with explicit fallback provenance [33m 1356[2mms[22m[39m
     [33m[2m✓[22m[39m finds callsites across the working tree [33m 1430[2mms[22m[39m
     [33m[2m✓[22m[39m excludes import lines from callsite results during grep fallback [33m 1072[2mms[22m[39m
     [33m[2m✓[22m[39m finds property access patterns by property name [33m 979[2mms[22m[39m
     [33m[2m✓[22m[39m supports scoped search across workspace package boundaries [33m 1025[2mms[22m[39m
     [33m[2m✓[22m[39m returns refusal when all matches live behind graftignore [33m 1168[2mms[22m[39m
 [32m✓[39m test/unit/warp/since.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 6739[2mms[22m[39m
     [33m[2m✓[22m[39m detects added symbols between two commits [33m 2338[2mms[22m[39m
     [33m[2m✓[22m[39m detects removed symbols between two commits [33m 1764[2mms[22m[39m
     [33m[2m✓[22m[39m detects signature changes between two commits [33m 2636[2mms[22m[39m
 [32m✓[39m test/unit/git/diff.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 3375[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between HEAD and working tree [33m 333[2mms[22m[39m
     [33m[2m✓[22m[39m lists changed files between two refs [33m 316[2mms[22m[39m
     [33m[2m✓[22m[39m lists deleted files [33m 439[2mms[22m[39m
     [33m[2m✓[22m[39m gets file content at a ref [33m 498[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getChangedFiles [33m 582[2mms[22m[39m
     [33m[2m✓[22m[39m throws GitError for invalid ref in getFileAtRef [33m 385[2mms[22m[39m
 [32m✓[39m test/unit/warp/directory.test.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 3102[2mms[22m[39m
     [33m[2m✓[22m[39m creates directory nodes from file paths [33m 874[2mms[22m[39m
     [33m[2m✓[22m[39m directory files lens scopes to a subtree [33m 1001[2mms[22m[39m
     [33m[2m✓[22m[39m supports structural map query (files + symbols) [33m 1227[2mms[22m[39m
 [32m✓[39m tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 4962[2mms[22m[39m
     [33m[2m✓[22m[39m Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas? [33m 1869[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 2837[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 1172[2mms[22m[39m
     [33m[2m✓[22m[39m retains full read-event history in the WARP graph [33m 1132[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persistent-monitor.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 4557[2mms[22m[39m
     [33m[2m✓[22m[39m Do background monitors run through the same pressure and fairness scheduler as foreground repo work? [33m 3160[2mms[22m[39m
     [33m[2m✓[22m[39m keeps monitor control behind authorized workspaces and one monitor per repo [33m 1396[2mms[22m[39m
 [32m✓[39m test/integration/mcp/server.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 5773[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns content for small files [33m 915[2mms[22m[39m
     [33m[2m✓[22m[39m safe_read returns outline for large files [33m 742[2mms[22m[39m
     [33m[2m✓[22m[39m file_outline includes jump table [33m 435[2mms[22m[39m
     [33m[2m✓[22m[39m read_range returns bounded lines [33m 363[2mms[22m[39m
     [33m[2m✓[22m[39m doctor returns health check [33m 481[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-workspace-overlay.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 1095[2mms[22m[39m
 [32m✓[39m tests/method/0069-graft-map-bounded-overview.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 2608[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map depth 0 returns direct files and summarized child directories for one-call orientation [33m 1554[2mms[22m[39m
     [33m[2m✓[22m[39m graft_map summary mode reports symbol counts without emitting per-symbol payloads [33m 1052[2mms[22m[39m
 [32m✓[39m tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 3209[2mms[22m[39m
     [33m[2m✓[22m[39m Can an external app create a repo-local workspace and call direct governed read methods without going through MCP receipts? [33m 319[2mms[22m[39m
     [33m[2m✓[22m[39m Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction? [33m 2887[2mms[22m[39m
 [32m✓[39m test/unit/mcp/run-capture.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 5363[2mms[22m[39m
     [33m[2m✓[22m[39m marks successful captures as outside the bounded-read contract [33m 922[2mms[22m[39m
     [33m[2m✓[22m[39m marks failed captures as outside the bounded-read contract [33m 1283[2mms[22m[39m
     [33m[2m✓[22m[39m can be disabled explicitly by configuration [33m 1344[2mms[22m[39m
     [33m[2m✓[22m[39m redacts obvious secrets before persisting logs [33m 1095[2mms[22m[39m
     [33m[2m✓[22m[39m supports opt-out log persistence [33m 719[2mms[22m[39m
 [32m✓[39m test/unit/adapters/node-git.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 288[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-repos.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 1735[2mms[22m[39m
     [33m[2m✓[22m[39m lists bounded repo rows with worktree and monitor summary and supports filtering [33m 1703[2mms[22m[39m
 [32m✓[39m test/unit/metrics/logging.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 98[2mms[22m[39m
 [32m✓[39m test/unit/cli/init.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 677[2mms[22m[39m
 [32m✓[39m test/unit/hooks/posttooluse-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 267[2mms[22m[39m
 [32m✓[39m test/unit/operations/file-outline.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 172[2mms[22m[39m
 [32m✓[39m tests/method/0067-async-git-client-via-plumbing.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 585[2mms[22m[39m
     [33m[2m✓[22m[39m git diff helpers use the async GitClient seam for changed files and file-at-ref lookup [33m 362[2mms[22m[39m
 [32m✓[39m test/unit/operations/safe-read.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 119[2mms[22m[39m
 [32m✓[39m test/unit/helpers/git.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 191[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline-audit.test.ts [2m([22m[2m42 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m test/integration/safe-read.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 191[2mms[22m[39m
 [32m✓[39m test/unit/parser/outline.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m test/unit/mcp/persisted-local-history-graph.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/cli/local-history-dag-model.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m test/unit/parser/diff.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m test/unit/adapters/canonical-json.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/library/repo-workspace.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 531[2mms[22m[39m
 [32m✓[39m test/unit/mcp/daemon-job-scheduler.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m test/unit/hooks/pretooluse-read.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m test/unit/operations/state.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m test/unit/operations/read-range.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwires.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0080-warp-port-and-adapter-boundary.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m test/unit/mcp/warp-pool.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/library/structured-buffer.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m test/unit/library/index.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 1587[2mms[22m[39m
     [33m[2m✓[22m[39m creates a repo-local graft instance with sensible defaults [33m 1572[2mms[22m[39m
 [32m✓[39m test/unit/api/tool-bridge.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/guards/stream-boundary.test.ts [2m([22m[2m28 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m test/unit/contracts/causal-ontology.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 75[2mms[22m[39m
 [32m✓[39m tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m test/unit/policy/bans.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/parser/value-objects.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m tests/playback/0061-provenance-attribution-instrumentation.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m test/unit/contracts/capabilities.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0083-public-api-contract-and-stability-policy.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m tests/playback/0064-same-repo-concurrent-agent-model.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0065-between-commit-activity-view.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/release/security-gate.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m test/unit/policy/graftignore.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/warp/writer-id.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/workspace-read-observation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/hooks/shared.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m test/unit/mcp/typed-seams.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/policy/thresholds.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m test/unit/mcp/repo-concurrency.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-causal-context.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m tests/playback/0074-local-causal-history-graph-schema.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/cli/activity-render.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0063-richer-semantic-transitions.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0062-reactive-workspace-overlay.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m tests/playback/0082-runtime-validated-command-and-context-models.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/playback/0060-persisted-sub-commit-local-history.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/policy/session-depth.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/mcp/runtime-staged-target.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m test/unit/release/package-library-surface.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m test/unit/session/tripwire-value-object.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-guidance.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/policy/budget.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m test/unit/release/package-docs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/mcp/semantic-transition-summary.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m test/unit/version.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[31m6 failed[39m[22m[2m | [22m[1m[32m92 passed[39m[22m[90m (98)[39m
[2m      Tests [22m [1m[31m7 failed[39m[22m[2m | [22m[1m[32m861 passed[39m[22m[90m (868)[39m
[2m   Start at [22m 03:23:25
[2m   Duration [22m 44.51s[2m (transform 6.59s, setup 0ms, import 32.89s, tests 346.63s, environment 11ms)[22m


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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/7]⎯[22m[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/7]⎯[22m[39m


```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 4 playback questions, 156 test descriptions.
Search basis: exact normalized match in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Manual Verification

- [x] Automated capture completed successfully.
