---
title: "Opened workspace paths"
legend: "SURFACE"
source_backlog: "docs/method/backlog/cool-ideas/SURFACE_opened-workspace-paths.md"
status: proposal
---

# Opened workspace paths

Source backlog item:
`docs/method/backlog/cool-ideas/SURFACE_opened-workspace-paths.md`

Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

An agent can start Graft MCP from one repository, later open another git
worktree path in the same MCP service, and make that path the active
workspace for existing repo-scoped tools without restarting the server
or adding per-tool `cwd` routing.

The model is:

- many opened workspaces
- one active workspace per MCP session
- explicit activation when the active workspace changes

## Playback Questions

### Human

- [ ] Can I tell an agent to work in another repo and have it open that
  path in the existing Graft MCP session?
- [ ] Can I inspect which paths are opened and which one is active?
- [ ] Does switching repos feel like opening another workspace, not
  editing low-level daemon authorization state by hand?

### Agent

- [ ] Can a repo-local MCP server open a second git worktree and run
  `safe_read`, `graft_map`, and `code_find` against it without process
  restart?
- [ ] Does activation reset session-local cache, budget, saved state,
  metrics, and repo-state tracking instead of bleeding state across
  worktrees?
- [ ] Does daemon mode reuse the existing authorization registry and
  capability profile rather than creating a parallel allowlist?
- [ ] Do repo-scoped tools keep their current repo-relative schemas?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: one list of opened
  workspaces, one active workspace, and explicit activation events.
- Non-visual or alternate-reading expectations: all state is returned
  as structured JSON through MCP surfaces; no operator should need to
  infer the active workspace from logs.

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  behavior is in scope.
- Logical direction / layout assumptions: none beyond canonical
  absolute paths and stable JSON field names.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: opened workspace
  records, active workspace identity, resolved repo/worktree ids,
  capability profile, whether activation created a fresh session slice,
  and why open/activation failed.
- What must be attributable, evidenced, or governed: workspace opening
  and activation decisions, server-resolved git identity, and daemon
  authorization/capability posture.

## Non-goals

- [ ] Do not add `cwd` or workspace routing envelopes to every
  repo-scoped MCP tool.
- [ ] Do not make unauthorized repos discoverable through daemon
  filtering.
- [ ] Do not expose raw receipts, cache content, saved state, runtime
  log payloads, or shell output through opened-workspace inspection.
- [ ] Do not make repo-local opened workspaces persistent global daemon
  state.
- [ ] Do not change Git history or worktree contents as part of opening
  a workspace.

## Current Repo Truth

The substrate already exists in pieces:

- `WorkspaceRouter` owns one active binding and has `bind` /
  `rebind`, fresh session-local slices, workspace status, and
  server-side identity resolution.
- `resolveWorkspaceRequest` resolves canonical repo/worktree identity
  from git and canonicalizes path aliases.
- `DaemonControlPlane` persists daemon-authorized workspaces keyed by
  resolved `worktreeId`.
- `workspace_authorize`, `workspace_bind`, `workspace_rebind`,
  `workspace_authorizations`, and `workspace_revoke` exist as daemon
  control-plane tools.
- `daemon_repos` already projects authorized repos without exposing
  session-local receipts, cache, saved state, or shell output.

The missing surface is ergonomic and repo-local: a server started in
repo A cannot explicitly open repo B and make repo B active without
starting another MCP server or using daemon-specific control-plane
vocabulary.

## Product Model

Use opened workspaces plus one active workspace.

Opened workspace:

- a resolved git worktree path Graft can use in this MCP process or
  daemon session
- identified by `repoId`, `worktreeId`, `worktreeRoot`, and
  `gitCommonDir`
- carries a capability profile
- has a source such as `startup`, `session_opened`, or
  `daemon_authorized`

Active workspace:

- the single workspace against which current repo-scoped tools operate
- changes only through explicit open/activation flow
- owns the current session-local slice

This preserves the existing repo-scoped tool contract: paths passed to
tools such as `safe_read`, `graft_map`, and `code_find` remain
repo-relative to the active workspace.

## Proposed MCP Surface

### `workspace_open`

Input:

```json
{
  "cwd": "/path/to/repo-or-subdir",
  "activate": true,
  "runCapture": false
}
```

Rules:

- `cwd` is required and is the main path hint.
- `activate` defaults to `true`.
- `runCapture` is daemon capability posture and remains default-denied
  unless explicitly enabled.
- Client-supplied repo/worktree ids are not accepted as authority.
- Non-git paths fail with the existing `NOT_A_GIT_REPO` style error.

Result:

- `ok`
- `changed`
- opened workspace record
- active workspace status
- `freshSessionSlice`
- optional `errorCode` / `error`

Daemon mode implementation:

- resolve `cwd`
- call or share the `DaemonControlPlane.authorizeWorkspace` path
- activate through existing bind/rebind semantics

Repo-local mode implementation:

- resolve `cwd`
- store the opened record in memory only
- activate through existing bind/rebind semantics

### `workspace_opened`

Returns:

- `workspaces`
- `activeWorktreeId`
- `sessionMode`

Each workspace record should include:

- `repoId`
- `worktreeId`
- `worktreeRoot`
- `gitCommonDir`
- `source`
- `active`
- `capabilityProfile`
- `openedAt`
- `lastActivatedAt`
- daemon-only active-session counts where available

Daemon mode may project the existing authorization registry plus active
binding state. Repo-local mode should project only the startup workspace
and paths opened by this process.

### `workspace_activate`

Potential follow-up surface.

Input:

```json
{
  "cwd": "/path/to/already-opened-repo"
}
```

or:

```json
{
  "worktreeId": "worktree:..."
}
```

Rules:

- target must already be opened or authorized
- activation starts a fresh session-local slice when changing
  worktrees
- result mirrors `workspace_open` activation fields

## Semantics By Runtime

### Repo-local MCP

`graft serve` remains simple:

- startup repo is opened and active
- `workspace_open` can add another git worktree to the process-local
  opened set
- opening another path does not persist a global authorization registry
- existing tools operate against whichever workspace is active

This solves the immediate user story: an agent can start from repo A,
then later open repo B in the same Graft MCP service.

### Daemon-backed MCP

Daemon mode keeps its current trust model:

- opened workspaces are backed by the daemon authorization registry
- authorization persists under the daemon graft directory
- `workspace_open` is a friendly wrapper over
  `workspace_authorize` plus `workspace_bind` / `workspace_rebind`
- `run_capture` remains denied unless the authorized workspace enables
  it

The low-level daemon tools remain available for operator control-plane
work. Agents should normally use `workspace_open` when they only need
to open and optionally activate a path.

## Security And Privacy Boundary

- Resolve all workspace identity server-side from git.
- Canonicalize paths through the existing workspace resolver.
- Do not use client-supplied ids as authority.
- Do not expose unauthorized daemon repos through filters or error
  detail.
- Do not expose another session's raw receipts, cache content, saved
  state, runtime-log payloads, or shell output.
- Keep repo-local opened workspaces process-local.
- Keep daemon authorization daemon-owned.

## Implementation Plan

1. Add opened-workspace model types:
   - `OpenedWorkspaceRecord`
   - `WorkspaceOpenRequest`
   - `WorkspaceOpenResult`
   - `WorkspaceOpenedResult`
   - optionally `WorkspaceActivateRequest`
2. Extend `WorkspaceRouter`:
   - seed the opened set with the repo-local startup binding
   - add `openWorkspace`
   - add `listOpenedWorkspaces`
   - optionally add `activateWorkspace`
   - reuse existing bind/rebind internals so fresh-slice behavior stays
     centralized
3. Extend daemon control-plane projection:
   - reuse authorized workspace records as opened records in daemon
     mode
   - preserve capability profile and active-session counts
4. Add MCP tools:
   - `workspace_open`
   - `workspace_opened`
   - optionally `workspace_activate`
5. Register `workspace_opened` and `workspace_open` in both repo-local
   and daemon tool registries.
6. Add output schemas and capability metadata.
7. Update MCP/setup docs to position `workspace_open` as the normal
   agent-facing path and `workspace_authorize` / `workspace_bind` as
   lower-level daemon control-plane tools.

## Test Strategy

Focused tests:

- repo-local server starts in repo A, opens repo B, and `safe_read`
  reads from repo B after activation
- `workspace_open({ activate: false })` adds repo B without changing
  the active workspace
- activation resets `state_save` / `state_load`
- two worktrees of the same repo share `repoId` but have distinct
  `worktreeId`
- a non-git path returns `NOT_A_GIT_REPO`
- path aliases resolve to one canonical worktree identity
- daemon `workspace_open` updates the existing authorization registry
- `workspace_opened` output validates against the MCP output schema

Playback tests should cover the human story end to end: start Graft
from one repo, open another repo path, inspect the opened set, and use
an existing repo-scoped tool against the new active workspace.

## Suggested First Slice

Ship the narrow version first:

- `workspace_open`
- `workspace_opened`
- repo-local availability for `workspace_status`
- `workspace_open({ activate: true })` as the common switch path

Defer standalone `workspace_activate` until there is evidence that
agents need a separate "open but do not activate, then activate later"
workflow often enough to justify another tool.

## Open Questions

- Should `activate` default to `true`? Recommendation: yes.
- Should the list tool be named `workspace_opened` or
  `workspace_list`? Recommendation: `workspace_opened`.
- Should repo-local opened workspaces ever persist beyond the process?
  Recommendation: no; persistence belongs to daemon authorization.
