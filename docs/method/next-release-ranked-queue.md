# Next Release Ranked Queue

Status: release bar cleared

## Release thesis

The next release should tighten the product around day-to-day coding
workflow truth before it expands into larger substrate bets.

That means:

- pay down the precision/search debt in the exact seams we are about to
  build on
- ship the next product-visible search/refactor capability on top of
  those cleaner seams
- only pull hook, context, and observability debt forward when the
  corresponding product surface is actually in the release

This is a release-shaping queue, not a commitment to burn down the full
`bad-code/` lane.

## Completed tranche

Cycle `0045-CODE_mcp-tool-precision` cleared the first pre-release debt
bar:

- `code_find` now uses a runtime-backed request model
- precision query matching and match shaping moved out of the shared
  helper blob
- git file enumeration now runs through typed query/result seams
- `graft_map` now uses runtime-backed request/result objects

This retires the old `bad-code` items for:

- `CLEAN_CODE_mcp-tool-code-find`
- `CLEAN_CODE_mcp-tool-precision`
- `CLEAN_CODE_mcp-tool-git-files`
- `CLEAN_CODE_mcp-tool-map`

Cycle `0046-default-governed-read-path` cleared the conditional hook
debt tranche and shipped the first honest default-read guardrail:

- Claude `PreToolUse` now redirects large JS/TS native reads to
  graft's bounded-read path before the full file lands in context
- `PostToolUse` now acts as a backstop for oversized code reads that
  still slip through
- hook inspection and policy evaluation now share a smaller seam

This retires the old `bad-code` items for:

- `CLEAN_CODE_hook-pretooluse-read`
- `CLEAN_CODE_hook-posttooluse-read`

Cycle `0047-non-claude-default-governed-read-integration` tightened the
next-highest-leverage non-Claude path:

- `graft init --write-codex-mcp` now seeds `AGENTS.md` alongside
  `.codex/config.toml`
- setup docs now distinguish MCP availability from actual governed-read
  posture by client
- the remaining non-Codex instruction parity question is explicit in
  backlog instead of implied

Cycle `0048-mcp-runtime-observability` cleared the last conditional
pre-release product/debt slice:

- MCP sessions now emit metadata-only runtime events for session start,
  tool call start, tool call completion, and tool failure
- receipts now carry `traceId` and `latencyMs`, so logs and responses
  correlate directly
- `doctor` now reports the active runtime observability posture

This pays down the receipt seam enough to keep observability shippable
without promoting the broader MCP context cleanup into a release bar.

Cycle `0049-CODE_sync-child-process-request-path` finished the shell/git
hexagonal cutover:

- added explicit `ProcessRunner` and `GitClient` ports plus node
  adapters
- moved MCP request-path git and shell execution behind those ports
- moved WARP indexing onto the same git seam
- removed the remaining `node:path` imports from `src/operations`

This retires:

- `CLEAN_CODE_sync-child-process-request-path`

Cycle `0049-non-read-burden` shipped the measurement-first follow-on:

- receipts now classify each tool call by burden kind and mark whether
  the result is non-read
- `stats` now exposes cumulative burden-by-kind totals and a non-read
  aggregate
- `doctor` now exposes a compact burden summary for the active session

This keeps the non-read question evidence-backed without dragging new
governor policy into the release bar.

Cycle `0050-shared-daemon-authz-and-isolation` shaped the next system
surface before transport work starts:

- the future shared daemon is now explicitly same-user and local-machine
  only by default, not an implicit remote or multi-user service
- workspace bind is the authorization event, with server-resolved repo
  and worktree identity
- session state, receipts, runtime logs, and escape hatches now have an
  explicit isolation model in repo docs and backlog follow-ons

This keeps the daemon direction honest without pretending the transport
or control plane already exist.

Cycle `0051-system-wide-mcp-daemon-and-workspace-binding` turned that
trust model into an actual routing contract:

- repo-local `graft serve` remains the current stdio contract
- a future daemon starts sessions unbound and authorizes repo-scoped
  access at explicit workspace bind time
- canonical repo identity, live worktree identity, and session-local
  state now have an explicit split in the design and architecture docs
- one repo-scoped WARP per canonical repo is now explicit, so shared
  daemon sessions do not silently mint separate default WARP instances
- the implementation path is now split into transport/lifecycle and
  bind/routing backlog items

This keeps the daemon roadmap concrete without pretending the daemon
transport already ships.

Cycle `0052-workspace-bind-and-routing-surface` made the routing
contract real inside the MCP server:

- daemon mode now exposes `workspace_bind`, `workspace_status`, and
  `workspace_rebind`
- daemon sessions now start unbound and deny repo-scoped tools until a
  bind succeeds
- successful rebind starts a fresh session-local slice, so cache,
  budget, and saved state do not silently carry across worktrees
- same-repo bindings now keep canonical repo identity stable and reuse
  one repo-scoped WARP handle by default inside the daemon server

This keeps the daemon work honest in code before any transport or
control-plane story is added.

Cycle `0053-local-daemon-transport-and-session-lifecycle` made the
daemon runtime path real:

- `graft daemon` now starts a same-user local daemon on a Unix socket or
  Windows named pipe
- `/mcp` now hosts Streamable HTTP MCP traffic, and `/healthz` exposes
  daemon liveness and active-session counts
- daemon sessions now open on initialize and close on DELETE instead of
  being implied by one process-global stdio lifetime
- same-repo daemon sessions now share one repo-scoped WARP pool by
  default while keeping repo-local `graft serve` unchanged

This keeps the daemon direction honest in runtime behavior, not just in
design and internal server mode.

Cycle `0054-system-wide-control-plane-for-persistent-monitors` shipped
the first real daemon control plane:

- daemon workspace authorization is now explicit and central instead of
  being implied by `workspace_bind`
- daemon-wide session and authorized-workspace inspection now exists
  through MCP
- daemon capability posture can now be changed per authorized workspace
  without exposing another session's receipts or shell output
- `/healthz` now reflects control-plane counts instead of only transport
  liveness

This makes the operator control plane real without pretending that
actual persistent monitor workers or tray UI now exist.

## Ranked queue

No remaining above-the-line work is required before the next release.

If we choose to keep pushing before cutting the packet, the next
candidate is:

1. [SURFACE_persistent-monitor-runtime-state-and-lifecycle.md](backlog/up-next/SURFACE_persistent-monitor-runtime-state-and-lifecycle.md)
   The daemon control plane is now real, but actual persistent monitor
   workers, lifecycle state changes, failure reporting, and backlog
   pressure remain separate work.

## Below the cut line

These items are real but should not be treated as release blockers for
the next packet:

- [SURFACE_non-codex-instruction-bootstrap-parity.md](backlog/cool-ideas/SURFACE_non-codex-instruction-bootstrap-parity.md)
- [SURFACE_persistent-monitor-runtime-state-and-lifecycle.md](backlog/up-next/SURFACE_persistent-monitor-runtime-state-and-lifecycle.md)
- [SURFACE_system-wide-multi-repo-agent-coordination.md](backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md)
- [CLEAN_CODE_mcp-server.md](backlog/bad-code/CLEAN_CODE_mcp-server.md)
- [CLEAN_CODE_mcp-repo-state.md](backlog/bad-code/CLEAN_CODE_mcp-repo-state.md)
- [WARP_name-based-symbol-matching.md](backlog/bad-code/WARP_name-based-symbol-matching.md)
- [WARP_persisted-sub-commit-local-history.md](backlog/up-next/WARP_persisted-sub-commit-local-history.md)
- [WARP_reactive-workspace-overlay.md](backlog/up-next/WARP_reactive-workspace-overlay.md)
- [WARP_symbol-identity-and-rename-continuity.md](backlog/up-next/WARP_symbol-identity-and-rename-continuity.md)

Why they stay below the line:

- they are broader substrate or semantics work
- they will absorb schedule quickly
- they do not buy as much immediate operator-facing sharpness as the
  current release frontier

## Notes

- This queue intentionally treats debt as attached to nearby product
  surfaces, not as a parallel cleanup program.
- The exact version number should be decided later in the shaped release
  packet under `docs/method/releases/vX.Y.Z/`.
- If the release narrows to only reference-search work, items 1 and 2
  should both drop out of the packet rather than dragging extra
  debt and scope into the ship.
