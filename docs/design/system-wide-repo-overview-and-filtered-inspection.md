---
title: "System-wide repo overview and filtered inspection"
---

# System-wide repo overview and filtered inspection

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-repo-overview-and-filtered-inspection.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Ship the first real daemon-wide repo overview surface without turning it
into a side channel or a second source of runtime truth.

That means:

- one bounded row per canonical repo
- repo identity remains keyed by `git common dir`
- visible repos come only from the authorization registry
- repo rows aggregate existing daemon-owned runtime state instead of
  inventing a parallel model
- filtered inspection narrows the view by authorized repo id or
  authorized worktree `cwd`
- raw receipts, cache content, saved state, runtime-log payloads, and
  shell output remain out of scope

## Playback Questions

### Human

- [x] Is there now one daemon-wide MCP surface that shows authorized
  repos instead of forcing an operator to mentally join workspaces,
  sessions, and monitors?
- [x] Can an operator filter that view to one authorized repo or
  worktree without widening access to unauthorized repos?
- [x] Does the repo row stay high-signal by default instead of becoming
  a dump of session-local detail?

### Agent

- [x] Is canonical repo identity still keyed by `git common dir` rather
  than worktree path?
- [x] Does the overview derive from the existing authorization registry,
  daemon sessions, and monitor runtime?
- [x] Is session-local truth still kept out of the daemon-global
  surface?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  one daemon-wide tool returns one repo row per authorized canonical
  repo, with nested worktree summaries and optional filter echo.
- Non-visual or alternate-reading expectations:
  the view is structured JSON with stable field names, so an operator or
  agent can inspect multi-repo daemon posture without reading raw logs
  or correlating several tools manually.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  fields stay machine-readable and stable, such as `repoId`,
  `gitCommonDir`, `boundSessions`, `backlogCommits`, and `lastActivityAt`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths for worktree and git-common-dir
  identity.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  which repos are visible, how many worktrees are authorized, whether a
  repo currently has bound sessions, whether a monitor exists, and how
  backlog and recent activity are summarized.
- What must be attributable, evidenced, or governed:
  repo rows come from `workspace_authorize`, daemon session registration,
  and persistent monitor state, not from hidden cache or receipt data.

## Non-goals

- [x] Do not expose raw receipt bodies, saved state content, runtime-log
  payloads, or shell output.
- [x] Do not make unauthorized repos discoverable by filtering.
- [x] Do not add fairness, scheduling, or resource arbitration logic in
  this cycle.
- [x] Do not merge same-repo concurrent-agent semantics into this
  overview surface.
- [x] Do not change repo-local `graft serve`.

## Backlog Context

The multi-repo coordination model from cycle `0056` established the
identity contract:

- canonical repo identity is `git common dir`
- live worktree identity is resolved worktree root
- daemon session identity remains transport-scoped and session-local

This cycle turns that contract into the first real daemon-wide
inspection surface:

- `daemon_repos`
  - one bounded row per authorized canonical repo
  - nested worktree summaries
  - bounded monitor summary
  - last-activity and backlog signal
  - optional filtering by authorized `repoId` or authorized worktree
    `cwd`

The row is intentionally a join over existing runtime seams:

- authorization registry in `DaemonControlPlane`
- live daemon session registry in `DaemonControlPlane`
- repo-scoped monitor state in `PersistentMonitorRuntime`

Related:

- `docs/design/0054-system-wide-control-plane-for-persistent-monitors/system-wide-control-plane-for-persistent-monitors.md`
- `docs/design/0055-persistent-monitor-runtime-state-and-lifecycle/persistent-monitor-runtime-state-and-lifecycle.md`
- `docs/design/0056-system-wide-multi-repo-agent-coordination/system-wide-multi-repo-agent-coordination.md`

Effort: M

## Implementation Notes

### New daemon-wide repo overview tool

- add `daemon_repos` as a daemon-only MCP surface
- return one row per authorized canonical repo
- include only bounded fields:
  - `repoId`
  - `gitCommonDir`
  - authorized-worktree count
  - bound-session count
  - active-worktree count
  - backlog commit count
  - last-bound and last-activity timestamps
  - a compact monitor summary
  - compact worktree summaries

### Filtering posture

- `repoId`
  - narrows the view to a visible canonical repo
- `cwd`
  - resolves through the authorization registry
  - if the worktree is unauthorized or not resolvable through the
    authorized surface, the result is an empty repo list
- filtering must not become a probe for unauthorized repos

### Relation to existing daemon tools

- `daemon_status`
  - remains the daemon-wide aggregate count surface
- `daemon_sessions`
  - remains the full per-session inspection surface
- `daemon_monitors`
  - remains the full per-monitor inspection surface
- `workspace_authorizations`
  - remains the full per-worktree authorization surface
- `daemon_repos`
  - is the bounded repo-level join over those existing seams

### Visibility and privacy

- only repos with at least one authorized workspace are visible
- session-local receipts, saved state, cache content, runtime-log
  payloads, and shell output never appear in the repo row
- same-repo daemon sessions may contribute counts, but not their private
  artifacts
