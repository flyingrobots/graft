# Persistent monitor runtime state and lifecycle

Source backlog item: `docs/method/backlog/up-next/SURFACE_persistent-monitor-runtime-state-and-lifecycle.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Ship the first honest persistent monitor runtime in daemon mode without
pretending the whole future system is finished.

That means:

- define one persistent monitor identity per canonical repo, not per
  worktree or per daemon session
- make monitor lifecycle explicit through daemon-only MCP tools:
  `monitor_start`, `monitor_pause`, `monitor_resume`, `monitor_stop`,
  and `daemon_monitors`
- choose one real worker instead of a fake abstraction:
  `git_poll_indexer`, a background incremental WARP indexer keyed by
  canonical `repoId`
- keep the runtime behind the existing workspace authorization contract
  so an unauthorized path cannot start, pause, resume, or stop a repo
  monitor
- surface bounded health and backlog summaries through `daemon_status`,
  `daemon_monitors`, and `/healthz`

## Playback Questions

### Human

- [x] Is there now a real daemon-visible monitor surface instead of a
  placeholder promise?
- [x] Can an operator start, pause, resume, and stop a monitor without
  binding the current daemon session first?
- [x] Is the default identity now one monitor per canonical repo rather
  than one monitor per worktree?

### Agent

- [x] Does the first monitor worker perform real useful work instead of
  a synthetic heartbeat?
- [x] Do monitor lifecycle actions still require an authorized
  workspace?
- [x] Does monitor state survive daemon restart and resume lawfully?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  one daemon control plane, many sessions, one persistent monitor per
  canonical repo, and one current worker kind: `git_poll_indexer`.
- Non-visual or alternate-reading expectations:
  lifecycle state, recent failure, and backlog pressure are available as
  structured MCP output and `/healthz` counts without requiring raw logs
  or tray UI.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  stable machine-readable states such as `running`, `paused`,
  `stopped`, `ok`, `lagging`, `error`, and `unauthorized`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths for worktree roots and git common
  dirs.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  monitor identity, worker kind, lifecycle state, health state, backlog
  count, and whether the repo still has an authorized anchor workspace.
- What must be attributable, evidenced, or governed:
  lifecycle changes, authorized-workspace anchoring, restart
  persistence, and the fact that the runtime does not widen repo access
  beyond the daemon authorization contract.

## Non-goals

- [x] Do not build a generic plugin framework for arbitrary background
  workers in this cycle.
- [x] Do not add tray UI, notification routing, or external control
  channels.
- [x] Do not widen monitor control to unauthorized workspaces in the
  same repo.
- [x] Do not create more than one default WARP monitor per canonical
  repo.
- [x] Do not claim multi-repo agent coordination or same-repo concurrent
  write safety is solved here.

## Backlog Context

Now that Graft has a daemon transport and a real control plane for
workspace authorization and session inspection, the remaining
"persistent monitors" gap should be explicit instead of implied.

Goals:
- define what a persistent repo monitor actually is in Graft
- expose start, stop, pause, and resume semantics through the daemon
  control plane
- surface monitor health, recent failures, and backlog pressure without
  exposing raw session-local receipts or shell output
- keep monitor state scoped to authorized workspaces and canonical repo
  identity
- avoid widening repo access beyond the existing workspace authorization
  contract

Questions:
- what work does a monitor perform continuously versus on demand
- is monitor identity per canonical repo, per worktree, or both at
  different layers
- what backlog-pressure signals are operator-useful before the UI
  becomes noisy
- how should monitor failures degrade when WARP is unavailable or
  behind
- how does the monitor lifecycle relate to future multi-repo
  coordination

Deliverables:
- explicit runtime model for persistent monitors
- daemon control-plane surface for lifecycle state changes
- bounded machine-readable health and backlog summaries
- follow-on split for any required WARP or scheduler work

Why separate cycle:
- cycle 0054 shipped the operator control plane for authorization and
  daemon-scoped inspection, but it did not ship actual persistent
  monitor workers or their lifecycle

Effort: L

## Implementation Notes

This cycle ships the first real daemon-side persistent worker.

### Runtime model

- monitor identity is per canonical `repoId`
- monitor persistence lives under the daemon graft dir in
  `control-plane/monitors.json`
- monitor actions are daemon-only MCP tools:
  - `daemon_monitors`
  - `monitor_start`
  - `monitor_pause`
  - `monitor_resume`
  - `monitor_stop`
- `daemon_status` and `/healthz` now include aggregate monitor counts:
  - total
  - running
  - paused
  - stopped
  - failing
  - backlog

### First worker kind

- worker kind: `git_poll_indexer`
- purpose:
  keep WARP indexing warm in the background without making agents block
  on an explicit `graft index` pass
- implementation:
  read repo head, incrementally call `indexCommits`, record indexed
  commit/head/backlog counters, and reschedule on a daemon-local poll
  interval

### Authorization model

- `monitor_start`, `monitor_pause`, `monitor_resume`, and
  `monitor_stop` all require an authorized workspace path
- an unauthorized path inside the same repo cannot control a monitor
- running monitors anchor themselves to an authorized workspace for the
  repo and degrade to `unauthorized` when no authorized anchor remains

### Repo-scoped WARP ownership

- one repo-scoped monitor per canonical repo remains the default
- the monitor runtime reuses the shared daemon `WarpPool`
- same-repo worktrees can all authorize and bind, but they do not mint
  separate default background WARP graphs

### Failure and backlog posture

- `ok`: no pending commit backlog after the last successful run
- `lagging`: commits remain between the last indexed head and current
  head
- `error`: the background indexer failed
- `unauthorized`: no authorized anchor workspace is currently available
- `paused` and `stopped` are explicit operator states, not inferred

### Follow-on split

This cycle makes the first monitor worker real, but it does not claim:

- cross-repo monitor orchestration
- same-repo concurrent agent write safety
- tray or menu-bar operator UX
- monitor workers beyond background WARP indexing
