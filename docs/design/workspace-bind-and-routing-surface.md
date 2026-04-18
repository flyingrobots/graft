---
title: "Workspace bind and routing surface for the local shared daemon"
---

# Workspace bind and routing surface for the local shared daemon

Source backlog item: `docs/method/backlog/up-next/SURFACE_workspace-bind-and-routing-surface.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Add the daemon-only binding/routing surface to the MCP server without
changing the current repo-local `graft serve` contract.

That means:

- daemon mode starts unbound
- `workspace_bind`, `workspace_status`, and `workspace_rebind` become
  real MCP tools
- repo-scoped tools are denied until the session is bound
- rebind starts a fresh session-local slice
- bindings that resolve to the same canonical repo reuse one
  repo-scoped WARP instance by default inside the daemon server process

## Playback Questions

### Human

- [x] Does repo-local `graft serve` still behave exactly like the old
  pre-bound server?
- [x] Can a daemon session bind from just `cwd` and get back resolved
  repo/worktree identity?
- [x] Does rebind reset cache, budget, and saved state instead of
  silently carrying them across worktrees?

### Agent

- [x] Are `workspace_bind`, `workspace_status`, and `workspace_rebind`
  actual MCP tools with declared output schemas?
- [x] Is unbound-vs-bound behavior enforced in code, not just described
  in docs?
- [x] Does same-repo rebind keep canonical repo identity stable while
  changing worktree identity and session-local slice state?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  repo-local mode remains the simple path; daemon mode is explicit and
  machine-readable about `unbound` versus `bound`.
- Non-visual or alternate-reading expectations:
  binding state and capability posture are returned as structured JSON,
  not inferred from logs or transport behavior.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  tool responses use stable enum-like values such as `bound`,
  `unbound`, `bind`, and `rebind`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths and JSON field order stability.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  session mode, bind state, resolved repo/worktree ids, resolved
  paths, and daemon-default capability posture.
- What must be attributable, evidenced, or governed:
  bind failure when `cwd` is outside a git repo, default-denied
  `run_capture` in daemon mode, and fresh session-local slice creation
  on rebind.

## Non-goals

- [ ] Expose a daemon transport or lifecycle command.
- [ ] Change the current repo-local stdio bootstrap path.
- [ ] Solve multi-session or multi-process WARP sharing beyond the
  current one-daemon-process default.
- [ ] Add a control plane for persistent monitors or multi-repo routing.

## Backlog Context

Now that the daemon trust model and workspace-binding contract are
explicit, implement the daemon-only bind/routing surface itself.

Why this matters:
- repo-scoped tools need one active workspace binding per daemon session
- authorization should happen when the daemon resolves and binds a
  workspace, not when arbitrary tool args mention paths
- caches, budgets, receipts, and saved state need a lawful boundary when
  a session rebinds

Desired end state:
- daemon-only `workspace_bind`, `workspace_status`, and
  `workspace_rebind` surfaces
- server-side resolution of `cwd` / worktree hints into canonical repo
  and worktree identity
- binds that resolve to the same canonical repo attach to one
  repo-scoped WARP history by default instead of creating implicit
  per-session or per-worktree WARP instances
- repo-scoped tools denied while the session is unbound
- rebind semantics that start a fresh session-local workspace slice by
  default instead of silently carrying cache/budget/state across
  worktrees
- capability profile attachment at bind time, including default-denied
  `run_capture`

Related:
- `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_local-daemon-transport-and-session-lifecycle.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L

## Implementation Notes

The actual implementation lands as an internal daemon session mode on
`createGraftServer()`, not as a new CLI entrypoint yet.

Concrete code shape:

- repo-local default server keeps the old pre-bound contract and does
  not register the daemon admin tools
- daemon mode registers the normal MCP surface plus
  `workspace_bind`, `workspace_status`, and `workspace_rebind`
- a shared workspace router owns current binding state, canonical repo
  identity, worktree identity, and the active session-local slice
- repo-scoped tools are rejected while unbound
- daemon mode keeps `run_capture` denied by default even after bind

Resolved identity model:

- `repoId` is a stable hash of the resolved `git common dir`
- `worktreeId` is a stable hash of the resolved worktree root
- `workspace_bind` and `workspace_rebind` ignore client hints as
  authority and resolve server-side from `cwd`

Session-local slice behavior:

- each successful bind or rebind gets a fresh `SessionTracker`,
  `ObservationCache`, `Metrics`, `RepoStateTracker`, and state dir
- `state_save` / `state_load` therefore reset on rebind by default
- successful rebinds inside the same repo preserve `repoId` and change
  `worktreeId`

WARP posture:

- WARP instances are cached by canonical repo id inside the daemon
  server process
- rebinds across worktrees of the same repo therefore reuse the same
  repo-scoped WARP handle by default
- deeper same-repo concurrent-agent semantics remain with
  `WARP_same-repo-concurrent-agent-model`
