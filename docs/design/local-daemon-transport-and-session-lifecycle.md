---
title: "Local daemon transport and session lifecycle"
---

# Local daemon transport and session lifecycle

Source backlog item: `docs/method/backlog/up-next/SURFACE_local-daemon-transport-and-session-lifecycle.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Ship a separate same-user local daemon runtime without changing the
current repo-local `graft serve` contract.

That means:

- `graft daemon` starts a local-only MCP transport on a Unix domain
  socket or Windows named pipe
- the daemon exposes explicit health and liveness surfaces
- MCP sessions open and close against the daemon transport instead of
  being implied by one process-wide stdio lifetime
- daemon sessions still start unbound and only gain repo-scoped access
  after `workspace_bind`
- several daemon sessions that bind into the same canonical repo reuse
  one repo-scoped WARP handle by default

## Playback Questions

### Human

- [x] Does `graft daemon` exist as an explicit runtime path separate
  from repo-local `graft serve`?
- [x] Can a local operator verify liveness without attaching a full MCP
  client first?
- [x] Can daemon sessions start, bind, and close without changing the
  repo-local stdio bootstrap story?

### Agent

- [x] Does the daemon listen only on a Unix socket or named pipe with no
  default TCP listener?
- [x] Does session lifecycle map to transport lifecycle instead of one
  process-global server instance?
- [x] Do multiple daemon sessions bound to the same canonical repo share
  one repo-scoped WARP pool by default?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  one daemon host, many daemon sessions, one active workspace binding
  per session, one repo-scoped WARP pool per canonical repo.
- Non-visual or alternate-reading expectations:
  transport health and session counts are available as structured JSON
  at `/healthz`, and daemon lifecycle remains inspectable without
  reading raw socket traces.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  health fields and lifecycle states use stable machine-readable names
  such as `daemon`, `unix_socket`, `named_pipe`, `bound`, and
  `unbound`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths for socket and workspace hints.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  socket path, daemon health path, MCP path, session-local lifecycle,
  and the fact that daemon sessions begin unbound.
- What must be attributable, evidenced, or governed:
  same-user local transport posture, session open/close semantics,
  failure behavior for invalid sessions or invalid JSON, and shared
  repo-scoped WARP ownership.

## Non-goals

- [x] Do not change the repo-local `graft serve` stdio contract.
- [x] Do not introduce a default TCP listener or remote transport.
- [x] Do not build the operator control plane in this cycle.
- [x] Do not widen daemon capabilities beyond the existing default-denied
  `run_capture` posture.
- [x] Do not solve multi-repo coordination or same-repo concurrent-agent
  semantics beyond default shared WARP ownership.

## Backlog Context

Implement the local-only transport and lifecycle layer for a future
shared Graft daemon.

Why this matters:
- the daemon needs an explicit runtime path separate from repo-local
  `graft serve`
- local-user authentication should come from the host transport and
  process boundary rather than from client-declared ids
- session open/close, health, and liveness need a real contract before
  control-plane or multi-repo coordination work can sit on top

Desired end state:
- explicit daemon startup path separate from repo-local stdio
- local-only transport such as Unix domain sockets or named pipes
- no default TCP listener
- same-user authentication posture enforced by transport permissions
- daemon session lifecycle with start, close, liveness, and failure
  behavior documented and implemented
- daemon session startup does not implicitly create separate WARP
  instances for sessions that later bind into the same canonical repo
- clean compatibility story that leaves current repo-local `serve`
  clients unchanged

Related:
- `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/design/0052-workspace-bind-and-routing-surface/workspace-bind-and-routing-surface.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L

## Implementation Notes

This cycle implements the daemon transport and lifecycle around the
existing daemon-mode MCP server surface from cycle 0052.

### Runtime shape

- `graft serve` remains repo-local stdio and is unchanged.
- `graft daemon` now starts a separate local-only runtime.
- The daemon listens on:
  - Unix domain sockets on macOS/Linux
  - named pipes on Windows
- No default TCP listener exists.

### Transport contract

- MCP traffic is served at `/mcp` over Streamable HTTP.
- Liveness is served at `/healthz`.
- POST `initialize` creates a daemon session.
- GET and DELETE reuse the session via the `mcp-session-id` header.
- DELETE closes the daemon session and removes it from the active session
  set.

### Session model

- each daemon transport session gets its own `createGraftServer({
  mode: "daemon" })`
- each daemon session therefore owns its own workspace router,
  session-local cache, budget, metrics, and saved-state slice
- daemon sessions still start unbound and require `workspace_bind`

### Shared repo state

- the daemon host now owns a shared in-memory WARP pool
- daemon sessions borrow from that pool by canonical `repoId`
- bind alone does not open WARP
- WARP opens lazily on first WARP-backed access and is then reused by
  later same-repo daemon sessions

### Failure behavior

- invalid JSON returns a JSON-RPC parse error
- unknown or missing daemon session ids are rejected
- stale Unix socket files are removed only if no active listener is
  present
- non-socket filesystem collisions refuse startup rather than being
  overwritten
