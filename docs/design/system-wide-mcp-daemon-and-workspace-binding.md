---
title: "System-wide MCP daemon and workspace binding"
---

# System-wide MCP daemon and workspace binding

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

The future daemon/workspace contract is explicit and implementable:
repo-local `graft serve` remains the current stdio path, while a future
local shared daemon uses a separate transport, starts sessions
unbound, resolves workspace identity server-side at bind time, and keys
repo, worktree, and session state separately without widening trust.

## Playback Questions

### Human

- [x] Can we say exactly how a future daemon session becomes bound to a
  workspace, and what normal MCP calls mean before and after that bind?
- [x] Can we keep the repo-local stdio contract intact while still
  defining a credible path to a local shared daemon?

### Agent

- [x] Does the design define the initial transport posture for a shared
  daemon?
- [x] Does it choose between session-start bind, per-call bind, or a
  hybrid?
- [x] Does it define the minimum bind payload and the server-resolved
  identity keys?
- [x] Does it split follow-on work into transport/lifecycle versus
  bind/routing implementation?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: keep the routing model in a
  small number of lifecycle states and identity tables
- Non-visual or alternate-reading expectations: docs should be enough to
  explain the contract without diagrams or protocol traces

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  behavior is in scope
- Logical direction / layout assumptions: none beyond standard
  left-to-right doc review

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: whether a session
  is unbound or bound, what workspace it is bound to, and what
  capabilities are attached to that binding
- What must be attributable, evidenced, or governed: bind decisions,
  resolved repo/worktree identities, and the scope of session-local
  cache, budget, receipts, and logs

## Non-goals

- [x] Do not implement the daemon transport in this cycle
- [x] Do not redesign the core MCP tool contracts to carry per-call repo
  routing envelopes
- [x] Do not build the operator control plane here
- [x] Do not define multi-repo coordination semantics beyond what the
  workspace-binding model requires

## Backlog Context

Design a single long-lived Graft service that can be used system-wide
by multiple agents at the same time, without assuming one fixed cwd or
one repo root per process.

Core problem:
- the current stdio server captures one `projectRoot`, one session,
  one cache, and one repo-state tracker at process start
- that is fine for repo-local dogfooding, but it is not the right
  contract for a shared system service

Questions:
- what transport should a system-wide shared service use instead of
  repo-scoped stdio?
- should clients bind workspace context at session start, per call, or
  both?
- what is the minimum binding payload:
  - cwd
  - worktree root
  - git common dir
  - explicit repo id
- what state should be keyed by:
  - git common dir for canonical repo/WARP identity
  - worktree root for live overlay, policy, and checkout state
  - client session for budget, cache, receipts, and saved state
- how does a bind request become an authorization decision instead of
  just a routing hint?
- how should the service behave when a client cwd is outside a git repo?
- how should worktrees of the same repo share WARP state without
  collapsing their live state?
- what stays repo-scoped by default when several sessions bind into the
  same canonical repo, especially around WARP ownership?
- what compatibility path keeps repo-local stdio useful while a daemon
  surface is introduced?

Deliverables:
- explicit daemon/session/workspace routing model
- explicit bind/rebind and capability-attachment model
- proposed MCP/CLI context-binding surface
- statement of which current assumptions are repo-scoped debug behavior
  versus future product contract
- follow-on backlog split for transport, daemon lifecycle, and routing
  implementation

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`

Why separate cycle:
- this is the architectural bridge between today's single-root stdio
  MCP server and the desired system-wide multi-agent service

Trust-model constraint from cycle 0050:
- shared daemon is same-user and local-machine only by default
- client-supplied repo/worktree ids are hints, not authority
- authorization happens when the daemon resolves and binds a workspace
- escape-hatch capabilities like `run_capture` should remain default-off
  until explicitly attached by policy

Effort: L

## Current Contract Versus Future Contract

Current supported contract:

- `graft serve` starts a repo-local stdio server
- `startStdioServer(cwd)` resolves one `projectRoot` and one `.graft`
  directory up front
- `createGraftServer()` instantiates one `SessionTracker`, one
  `ObservationCache`, one `Metrics`, and one `RepoStateTracker` per
  process
- non-interactive no-arg CLI startup still upgrades to `serve`, which
  preserves existing MCP client compatibility

Future daemon contract:

- a new daemon entrypoint is explicit and separate from repo-local
  `serve`
- one daemon process may host many client sessions
- sessions begin unbound
- repo-scoped tools operate only after a workspace bind event

The key design rule is: do not overload today's repo-local stdio path
with daemon semantics.

## Transport Posture

The first shared-daemon transport should be local-only and same-user:

- Unix domain socket on macOS/Linux, named pipe equivalent on Windows
- no default TCP listener
- OS transport permissions are the first gate
- client identity comes from the local transport/process boundary when
  possible, not from arbitrary MCP payload strings

Proposed operator-facing split:

- `graft serve` continues to mean repo-local stdio
- a future explicit daemon command, such as `graft daemon`, owns the
  long-lived local service

That preserves current client bootstrap docs and keeps the compatibility
story honest.

## Binding Model

Choose a hybrid with one primary path:

1. A daemon session starts unbound.
2. The client performs an explicit workspace bind.
3. Normal repo-scoped MCP tools run against the current binding.
4. The client may explicitly rebind to another workspace later.

Per-call routing is not the primary contract. It would force repo and
worktree context into every tool schema, weaken cache/session semantics,
and make authorization harder to reason about. The initial daemon model
should keep one active binding per session.

## Proposed MCP Surface

Daemon-only administrative tools:

- `workspace_bind`
- `workspace_status`
- `workspace_rebind`

Proposed `workspace_bind` request:

```json
{
  "cwd": "/path/inside/or/near/worktree",
  "worktreeRoot": "/optional/hint",
  "gitCommonDir": "/optional/hint",
  "repoId": "optional-hint"
}
```

Rules:

- `cwd` is the main hint and should usually be enough
- the other fields are hints only
- the daemon resolves canonical identities server-side
- a successful bind returns the resolved identity plus the session
  capability profile

Proposed `workspace_status` result:

- current bind state: `unbound` or `bound`
- resolved `repoId`
- resolved `worktreeRoot`
- resolved `gitCommonDir`
- capability profile summary

`workspace_rebind` should require an explicit action and, by default,
start a fresh session-local slice for cache, budget, and saved state.
That avoids silent state bleed from one worktree into another.

## Minimum Binding Payload And Resolved Identity

Client-provided hints:

- `cwd`
- optional `worktreeRoot`
- optional `gitCommonDir`
- optional `repoId`

Server-resolved identity:

- `repoId`: canonical repo identity keyed from git common dir
- `worktreeId`: live workspace identity keyed from resolved worktree
  root
- `sessionId`: daemon-minted session identity

Keying model:

| Concern | Key |
| --- | --- |
| Canonical repo / WARP history | git common dir |
| Live overlay / policy / checkout | resolved worktree root |
| Session budget / cache / receipts / saved state | session id + worktree id |

Current WARP constraint:

- one repo-scoped WARP instance per canonical repo is the current
  baseline contract
- multiple daemon sessions or worktrees that resolve to the same `git
  common dir` share that canonical WARP history instead of minting
  separate default WARP instances
- per-session or per-worktree WARP forks remain a later explicit design,
  not an accidental consequence of workspace binding

## Unbound Sessions

Before bind, a daemon session should only expose:

- daemon health / status
- `workspace_bind`
- maybe `explain` and other non-repo diagnostics if they do not reveal
  repo-local state

Repo-scoped reads, structural queries, precision tools, and shell
escape hatches should not operate while unbound.

If the supplied `cwd` is outside a git repo:

- `workspace_bind` should fail clearly with a machine-readable reason
- the session remains unbound
- the daemon does not fabricate repo identity or silently widen scope

## Capability Attachment

A bind result should attach a capability profile to the session.

Initial daemon-default profile:

- bounded reads: allowed
- structural tools: allowed
- precision tools: allowed
- `state_save` / `state_load`: allowed within the bound workspace slice
- runtime receipts/logs: session-local visibility only
- `run_capture`: denied by default

This is where the authz decision becomes concrete: bind is not just
route selection; it is the point where the daemon attaches permitted
capabilities to the session for the resolved workspace.

## Compatibility Path

The compatibility path should be additive, not magical:

- keep generated client config pointing at repo-local `graft serve`
  until the daemon surface is implemented and proven
- keep no-arg non-interactive `serve` compatibility only for the current
  repo-local path
- do not silently redirect existing stdio clients into a daemon

That preserves dogfood and local-debug workflows while letting the
daemon evolve as a separate contract.

## Follow-on Backlog Split

This cycle splits the implementation path into:

- [SURFACE_workspace-bind-and-routing-surface.md](../../method/backlog/up-next/SURFACE_workspace-bind-and-routing-surface.md)
- [SURFACE_local-daemon-transport-and-session-lifecycle.md](../../method/backlog/up-next/SURFACE_local-daemon-transport-and-session-lifecycle.md)
- [WARP_same-repo-concurrent-agent-model.md](../../method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md)
- [SURFACE_system-wide-control-plane-for-persistent-monitors.md](../../method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md)
- [SURFACE_system-wide-multi-repo-agent-coordination.md](../../method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md)
