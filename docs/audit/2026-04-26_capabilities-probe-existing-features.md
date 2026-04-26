# Capabilities Probe / Existing Features Discovery Audit

Date: 2026-04-26
Branch: `release/v0.7.0`
Head: `dffa294`
Scope: bounded discovery pass before DAG or feature work.

This audit checks what is actually callable, exported, wired, and tested. It
does not treat README/backlog claims as implementation evidence.

## Status Legend

- `WORKING`: implemented, reachable through the named surface, and covered by
  tests or a successful live command.
- `PARTIAL`: real substrate exists, but the claim is incomplete, uneven across
  surfaces, or missing a release-facing wire.
- `STUB`: callable placeholder without meaningful behavior.
- `DOC-ONLY`: documented or backlogged, but no callable implementation found.
- `BROKEN`: implementation or tool output contradicts repo truth.
- `UNKNOWN`: not enough evidence in this bounded pass.

## Capability Matrix

| Capability | README Claim | Code Exists? | CLI? | MCP? | API? | Tests? | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public package API | README shows direct library usage. | Yes: `src/index.ts`, `src/api/index.ts` | N/A | N/A | Yes | Yes: `test/unit/library/index.test.ts`, `test/unit/release/package-library-surface.test.ts` | WORKING | Root package exports are explicit and release-gated. |
| Repo-local workspace API | README shows `createRepoWorkspace()` and policy-aware reads. | Yes: `src/api/repo-workspace.ts`, `src/operations/repo-workspace.ts` | Yes: `read safe`, `read outline`, `read range`, `read changed` | Yes: `safe_read`, `file_outline`, `read_range`, `changed_since` | Yes | Yes: `test/unit/library/repo-workspace.test.ts` | WORKING | Live `read outline src/index.ts --json` succeeded with schema/receipt. |
| Repo-local Graft tool bridge | README shows `createRepoLocalGraft()` and `callGraftTool()`. | Yes: `src/api/repo-local-graft.ts`, `src/api/tool-bridge.ts` | Indirect | Yes | Yes | Yes: `test/unit/api/tool-bridge.test.ts` | WORKING | Converts MCP text payloads into validated API results. |
| Structured buffer / projection API | README shows `createStructuredBuffer()` and `createProjectionBundle()`. | Yes: `src/operations/structured-buffer.ts`, `src/operations/projection-bundle.ts` | Indirect through peer commands | Indirect through precision/structural tools | Yes | Yes: `test/unit/library/structured-buffer.test.ts` | WORKING | Dirty-buffer outline, injections, folds, diagnostics, rename preview, range mapping, and summaries are tested. |
| CLI entrypoint and router | README advertises `graft init`, `graft serve`, `graft daemon`, and grouped commands. | Yes: `bin/graft.js`, `src/cli/main.ts`, `src/cli/command-parser.ts` | Yes | N/A | N/A | Yes: command parser and output-schema tests | WORKING | Live `node bin/graft.js help` listed the expected command groups. |
| Three-surface command contract | README says API, CLI, and MCP are first-class entrypoints. | Yes: `src/contracts/capabilities.ts` | Yes | Yes | Indirect through bridge plus root exports | Yes: `test/unit/release/three-surface-capability-posture.test.ts` | WORKING | Baseline reports 47 capabilities: 20 API+CLI+MCP, 22 API+MCP, 4 CLI-only, 1 API-only. |
| Machine-readable receipts and schemas | README claims machine-readable contracts. | Yes: `src/contracts/output-schemas.ts`, schema metadata files | Yes | Yes | Yes | Yes: `test/unit/contracts/output-schemas.test.ts` | WORKING | Live CLI calls returned `_schema` and `_receipt`. |
| Repo-local stdio MCP server | README advertises `graft serve`. | Yes: `src/mcp/stdio-server.ts`, `src/mcp/server.ts` | Yes: `serve` | Yes | Yes: `startStdioServer()` | Yes: `test/integration/mcp/server.test.ts` | WORKING | Integration tests list registered tools and exercise reads/stats/doctor. |
| MCP tool registry | README says MCP tools expose Graft capabilities. | Yes: `src/mcp/tool-registry.ts` | N/A | Yes | Yes: `MCP_TOOL_NAMES` | Yes: MCP unit/integration tests | WORKING | Registry lists repo-local and daemon-only tools; output schemas cover all registered MCP tools. |
| Policy-enforced reads | README centers governed reads and budgets. | Yes: read governor, workspace APIs, MCP handlers | Yes | Yes | Yes | Yes: repo workspace, MCP tools, policy middleware tests | WORKING | `.graftignore`, budgets, cache, safe reads, outlines, and ranges are covered. |
| Structural diff/since/map | README promises structural context. | Yes: structural operations and CLI peer commands | Yes: `struct diff`, `struct since`, `struct map` | Yes: `graft_diff`, `graft_since`, `graft_map` | Indirect | Yes | WORKING | Live `struct map src --json` succeeded. |
| Structural log/churn/exports/review/difficulty | CLI help exposes advanced structural commands. | Yes: WARP-backed tool implementations | Yes | Yes | Indirect | Partial | WORKING | Callable surfaces exist. `docs/CLI.md` and `docs/SETUP.md` under-document this command set. |
| Precision code navigation | README implies code intelligence through structural memory. | Yes: `code_show`, `code_find`, `code_refs` tools | Yes: `symbol show`, `symbol find`; refs via MCP | Yes | Indirect | Yes | PARTIAL | `code_refs` still uses text search fallback/approximate provenance while WARP reference graph code also exists. |
| Daemon runtime and control plane | README advertises industrial daemon mode. | Yes: daemon server, worker pool, scheduler, monitor runtime | Yes: `daemon` | Yes: daemon-only tools | Yes: `startDaemonServer()` | Yes: daemon integration/unit tests | WORKING | Tests cover health, sessions, off-process reads, dirty precision lookups, workspace binding, and monitor lifecycle. |
| Daemon-backed stdio bridge | Backlog expects MCP clients can use daemon-backed stdio. | Partial: `src/mcp/daemon-stdio-bridge.ts` | No release-facing command found | Yes internally | No root export found | Yes: `test/unit/mcp/daemon-stdio-bridge.test.ts`, `test/integration/mcp/daemon-bridge.test.ts` | PARTIAL | The bridge substrate exists and is tested, but `init` still points MCP clients at `serve` and no CLI command exposes the bridge as a product surface. |
| Opt-in daemon MCP bootstrap | Backlog expects daemon mode in client bootstrap. | Partial: normal init exists | No `--mcp-runtime daemon` found | N/A | N/A | No focused release-facing test found | PARTIAL | `src/cli/init-model.ts` writes MCP args as `serve`; no daemon runtime option is wired. |
| Workspace binding and daemon authorization | Daemon mode implies multi-workspace control. | Yes: workspace router/authz/control-plane modules | Mostly MCP-driven | Yes: `workspace_*` tools | No direct root API found | Yes: workspace binding and daemon tests | WORKING | Daemon-only binding surfaces are real and tested. |
| WARP lazy HEAD index | README says WARP tracks AST evolution across Git commits. | Yes: `src/warp/index-head.ts`, `src/warp/open.ts` | Indirect | Indirect | No direct root API | Yes: `test/unit/warp/index-head.test.ts` | PARTIAL | Actual policy is lazy HEAD indexing from `git ls-files`, guarded by file limits and oversize refusal. This is not an automatic full-history AST index. |
| WARP structural memory queries | README promises structural memory. | Yes: structural query, reference, timeline, churn, review, difficulty modules | Yes | Yes | No direct root API | Yes | PARTIAL | Real WARP-backed behavior exists, but some call sites still use broad `getNodes()`/`getEdges()` and some surfaces are not unified around the WARP reference graph. |
| WARP provenance/worldline blame | Backlog requires blame through worldline/provenance. | Partial: `graft_blame` exists | Yes: `symbol blame` | Yes: `graft_blame` | Indirect | Partial | PARTIAL | Current last-touch provenance is timeline-derived; backlog target to use `Worldline.seek()` and `ProvenanceIndex` remains valid. |
| Causal provenance / session tracking | README says read/stage/transition activity is logged into strand-scoped workspaces. | Yes, runtime-local: causal context, local history, activity views | Yes: `diag activity`, `diag local-history-dag`, `diag capture` | Yes: `causal_status`, `activity_view`, `causal_attach` | No direct root API | Yes | PARTIAL | Runtime-local artifact history exists. Canonical provenance/causal collapse is explicitly not implemented. |
| Runtime observability | README implies observable sessions and receipts. | Yes: runtime observability and persisted local history modules | Yes: `diag doctor`, `diag stats` | Yes: `doctor`, `stats`, `activity_view` | Indirect | Yes | PARTIAL | Live doctor command succeeded, but reported workspace overlay degraded when hooks were not installed. |
| METHOD/backlog lane inventory | METHOD defines backlog lanes and cycle flow. | External METHOD MCP plus repo docs | No repo CLI found | Yes: METHOD MCP | N/A | Unknown | PARTIAL | METHOD MCP reported 11 `v0.7.0` cards and 73 `cool-ideas`; lane inventory is usable. |
| METHOD active cycle status | METHOD/retros should distinguish active from completed cycles. | External METHOD MCP | N/A | Yes | N/A | Unknown | BROKEN | METHOD MCP reported five completed design docs as active cycles despite their `status: completed` frontmatter and retro links. |
| Backlog dependency DAG | Backlog should expose blockers before pulling work. | Partial: `docs/method/backlog/dependency-dag.dot` | N/A | N/A | N/A | No generator/test found | BROKEN | DAG exists, but currently has nodes without dependency edges from `blocked_by`/`blocking` frontmatter. |
| Governed edit/write tools | Backlog proposes agent DX governed edit/write surfaces. | No `graft_edit` or governed write tool found | No | No | No | No | DOC-ONLY | This should not be pulled until current read/daemon/provenance surfaces are mapped and stabilized. |
| Agent drift warning | Backlog depends on governed edit interception. | No focused implementation found | No | No | No | No | DOC-ONLY | Valid concept, but blocked by write-tool substrate. |
| LSP enrichment | Backlog proposes semantic enrichment. | No LSP/tsserver enrichment found | No | No | No | No | DOC-ONLY | Structured-buffer lexical syntax support exists, but that is not LSP enrichment. |
| `git graft enhance` | Backlog proposes git-style enhancement flow. | Only `git-graft` bin alias found | No dedicated enhance command | No | No | No | DOC-ONLY | `git-graft` currently points to the same CLI as `graft`; enhancement behavior is not implemented. |

## Highest-Risk Claim Mismatches

1. README overstates WARP as if AST evolution across Git commits is already a
   complete, automatic product behavior. Reality: WARP substrate and lazy HEAD
   indexing are real and guarded, but historical/worldline/provenance behavior
   is still uneven.
2. README provenance language can be read as canonical causal provenance.
   Reality: runtime-local artifact history and session tracking are real and
   tested, while canonical provenance/causal collapse is explicitly out of
   scope in current code.
3. Daemon-backed stdio bridge work is not missing from scratch. Reality:
   implementation and tests already exist; the missing piece is release-facing
   CLI/bootstrap wiring.
4. METHOD MCP active-cycle reporting contradicts repo truth. It lists completed
   design docs as active cycles even when their frontmatter says completed and
   links a retro.
5. The backlog dependency DAG is not an executable truth surface yet. It omits
   dependency edges that are present in cards, so it can mislead pull order.
6. CLI docs drift behind the actual surface. `docs/CLI.md` and `docs/SETUP.md`
   under-document `struct churn`, `struct exports`, `struct log`, and
   `struct review`, although `graft help` exposes them.

## Duplicated or Overlapping Surfaces

- `code_refs` has a text-search/approximate-provenance path while WARP
  reference graph and reference-count modules also exist. This should be
  intentionally unified or clearly documented as separate precision tiers.
- `TOOL_REGISTRY`, `MCP_TOOL_NAMES`, `CAPABILITY_REGISTRY`, generated docs, and
  README/SETUP prose all describe surface area. Tests keep the contract files
  aligned, but prose docs still drift.
- Daemon stdio bridge code/tests exist while the backlog card reads like the
  bridge itself is absent. The card should be rewritten around product exposure.
- `git-graft` exists as a bin alias, while `git graft enhance` is a future
  command. The naming overlap should be made explicit when that card is pulled.

## Missing Tests for Existing or Half-Existing Behavior

- No release-facing test proves a user can start the daemon-backed stdio bridge
  through a CLI command, because no such command is wired.
- No test proves `graft init` can emit daemon-mode MCP config, because no
  `--mcp-runtime daemon` or equivalent exists.
- No repo test proves METHOD active-cycle reporting excludes
  `status: completed` design docs.
- No generator/test enforces `docs/method/backlog/dependency-dag.dot` edges from
  card frontmatter.
- No release test compares README/SETUP command lists against `graft help`.
- No focused test proves `graft_blame` last-touch evidence comes from
  `Worldline.seek()` plus `ProvenanceIndex`.

## Backlog Steering

Best next `v0.7.0` pull, after fixing the DAG truth surface if desired:

1. `CORE_daemon-aware-stdio-bridge-for-mcp-clients`

Why: it is half-wired, not speculative. The daemon bridge implementation and
tests already exist; exposing it as a CLI/bootstrap surface would convert real
substrate into coherent product behavior and unlock
`CORE_opt-in-daemon-mode-mcp-bootstrap` and the daemon control-plane UI path.

Do not pull `SURFACE_agent-dx-governed-edit` next. It is core-product write
surface work, and this audit confirms the read/daemon/provenance truth surfaces
still have enough unevenness that adding write tools now would compound drift.

## Backlog Card Recommendations

- Rewrite `CORE_daemon-aware-stdio-bridge-for-mcp-clients` to say the bridge
  substrate exists; scope the card to CLI exposure, client bootstrap target,
  health checks, and release-facing tests.
- Keep `CORE_opt-in-daemon-mode-mcp-bootstrap`, but block it on the daemon
  bridge command and scope it to `graft init`/client config generation.
- Keep `SURFACE_bijou-tui-for-graft-daemon-control-plane`, but do not pull it
  until daemon bridge/bootstrap are product surfaces.
- Keep `CORE_rewrite-structural-blame-to-use-warp-worldline-provenance`, but
  scope it narrowly to replacing timeline-derived last-touch evidence with
  `Worldline.seek()` and `ProvenanceIndex` evidence.
- Keep `CORE_migrate-to-slice-first-reads`; the audit still found broad
  `getNodes()`/`getEdges()` calls in `src/warp/structural-queries.ts`,
  `src/warp/dead-symbols.ts`, `src/warp/index-head.ts`,
  `src/warp/symbol-timeline.ts`, `src/mcp/persisted-local-history.ts`, and
  `src/cli/local-history-dag-model.ts`.
- Keep `CORE_migrate-path-ops-to-port`; direct `node:path` imports remain
  outside adapter boundaries in API, CLI, MCP, hooks, and git modules.
- Keep `SURFACE_agent-dx-governed-edit`, `SURFACE_governed-write-tools`, and
  `CORE_agent-drift-warning` blocked until write-surface design is backed by
  current read/provenance/daemon truth.
- Keep `WARP_lsp-enrichment` as a real missing feature, not a hardening task.
- Keep `CORE_git-graft-enhance` blocked behind provenance-backed blame; clarify
  that the current `git-graft` bin alias is not the enhance command.
- File or rewrite truth-surface work for METHOD active-cycle detection and
  dependency DAG generation before using either as steering authority.

## Commands Run

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `find docs ...` for audit conventions and backlog lane counts
- `sed` reads of README, package metadata, API, CLI, MCP, daemon, WARP,
  contract, docs, and tests
- `rg` searches for public exports, MCP tools, daemon bridge, governed edit,
  LSP enrichment, `git graft enhance`, `getNodes()`, `getEdges()`, and
  `node:path`
- `pnpm exec tsx -e ...` against capability contracts
- `node --import tsx -e ...` against the MCP tool registry
- `node bin/graft.js help`
- `node bin/graft.js --cwd /Users/james/git/graft diag doctor --json`
- `node bin/graft.js --cwd /Users/james/git/graft read outline src/index.ts --json`
- `node bin/graft.js --cwd /Users/james/git/graft struct map src --json`
- METHOD MCP `method_status` summary

One registry probe through `pnpm exec tsx -e ...` failed because the transform
path treated top-level await as CommonJS. The equivalent `node --import tsx`
probe succeeded, so this was treated as a probe-command mismatch rather than a
product capability failure.

## Worktree

The tracked worktree was clean before this report artifact was created.
Production code was not modified.
