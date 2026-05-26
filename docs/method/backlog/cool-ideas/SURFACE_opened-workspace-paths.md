---
title: "Opened workspace paths"
feature: mcp
kind: trunk
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "Workspace bind and routing surface (shipped)"
  - "Daemon control plane authorization registry (shipped)"
  - "Daemon-backed stdio MCP runtime (shipped)"
acceptance_criteria:
  - "A repo-local MCP session can open a second git worktree path without restarting the server"
  - "The newly opened path can become the active workspace for existing repo-scoped tools"
  - "Repo-scoped tools keep repo-relative schemas and do not each grow their own cwd parameter"
  - "Activation starts a fresh session-local slice so cache, budget, saved state, and repo-state tracking do not bleed across worktrees"
  - "Daemon mode reuses the existing authorization registry and capability profile instead of inventing a second permission model"
  - "Opened workspaces are inspectable through a structured MCP surface"
---

# Opened workspace paths

Agents sometimes start the Graft MCP service from one repository, then
later need to work in another repository path. The agent can edit that
other repo through the host environment, but the original Graft MCP
server remains pinned to the startup repo. The useful product behavior
is to let the session explicitly open another git worktree path and
optionally make it active.

This should be modeled as opened workspaces plus one active workspace:

- an opened workspace is a git worktree path Graft has resolved and is
  allowed to use in this MCP process or daemon session
- the active workspace is the single workspace that repo-scoped MCP
  tools currently operate against
- activation switches the active workspace through the same fresh-slice
  boundary as `workspace_rebind`

Do not add `cwd` to every repo-scoped tool. That would spread routing,
authorization, cache, receipt, budget, and causal-workspace semantics
across the whole tool surface.

## Proposed surface

- `workspace_open`
  - input: `cwd`, optional `activate`, optional daemon capability
    posture such as `runCapture`
  - resolves git identity server-side
  - adds the worktree to the opened set
  - activates it by default
- `workspace_opened`
  - lists opened/authorized workspaces and marks the active one
- `workspace_activate`
  - switches to an already-opened workspace by `cwd` or `worktreeId`
  - starts a fresh session-local slice

The first implementation slice can be narrower: ship `workspace_open`
and `workspace_opened`, with `workspace_open({ activate: true })` as
the common switch path. A standalone `workspace_activate` can follow if
the split proves useful in practice.

## Semantics

Repo-local mode:

- seed the opened set with the startup repository
- `workspace_open` adds another resolved git worktree to the current
  process only
- opened workspaces are not persisted globally

Daemon mode:

- `workspace_open` is an ergonomic wrapper around the existing
  `workspace_authorize` plus `workspace_bind` or `workspace_rebind`
  flow
- authorization remains persisted under the daemon graft directory
- capability posture remains attached to the authorized workspace

Both modes:

- server-side git resolution is authoritative
- symlink and path alias canonicalization follows existing workspace
  resolution
- activation starts a fresh session-local slice when the active
  worktree changes
- existing repo-scoped tools continue to use the active workspace

## Related design packet

- `docs/design/SURFACE_opened-workspace-paths.md`
