---
title: "Bijou daemon status first slice"
feature: daemon
kind: leaf
legend: SURFACE
lane: v0.7.0
requirements:
  - "Daemon status/session/repo/monitor MCP surfaces exist (shipped)"
  - "Daemon-backed stdio runtime selection exists (shipped)"
  - "Bijou CLI rendering dependency exists (shipped)"
acceptance_criteria:
  - "CLI command exposes a read-only daemon status/control-plane view"
  - "Status model is built separately from terminal rendering"
  - "Model includes daemon health, session counts, workspace authorization/bind posture, monitor summary, scheduler pressure, and worker pressure"
  - "Renderer has deterministic tests and does not require a live terminal"
  - "Command works against the default daemon socket and explicit --socket"
  - "No authorize/revoke, workspace bind/rebind, monitor pause/resume/start/stop, or other mutating actions"
  - "Docs describe the command as the read-only first slice"
---

# Bijou daemon status first slice

# Why

The daemon now has a real control plane, daemon-backed stdio runtime
selection, persistent monitor lifecycle state, and tested MCP inspection
tools. Human operators still have to reconstruct daemon posture from
separate MCP calls or raw JSON. Graft already depends on
`@flyingrobots/bijou` and `@flyingrobots/bijou-node`, so the first
release-facing surface should make read-only daemon state legible in the
terminal before adding live refresh or operator actions.

# Relevance and scope check

Classification: too broad and partially satisfied by existing daemon
surfaces.

Already real:

- `daemon_status`, `daemon_sessions`, `daemon_repos`, and
  `daemon_monitors` expose the read-side substrate through MCP.
- `workspace_status` and `workspace_authorizations` expose bind and
  authorization posture.
- `monitor_start`, `monitor_pause`, `monitor_resume`, and
  `monitor_stop` exist, but are intentionally out of scope for this
  first slice.
- `graft serve --runtime daemon` and generated MCP config already make
  daemon-backed runtime selection release-facing.
- `diag local-history-dag` already proves a CLI model plus Bijou
  rendering pattern.

Remaining first slice:

- add an explicit CLI status/control-plane view for daemon state
- build a deterministic status model from existing daemon read-side
  truth
- render that model with a terminal-friendly layout
- test model construction and rendering without a live terminal
- document the command as read-only and explain the default socket and
  explicit `--socket` path

Deferred follow-up scope:

- live refresh and stale-data indicators
- keyboard navigation or pane switching
- mutating actions such as authorize, revoke, bind, rebind, pause,
  resume, start, or stop

# Implementation shape

Build the model first. The model boundary should be testable without
Bijou or terminal state and should normalize the already-shipped daemon
read surfaces into a single operator posture:

- daemon health and socket/runtime metadata
- active, bound, and unbound session counts
- authorized workspace and repo counts
- workspace bind/authorization posture for the current cwd when
  available
- monitor totals and failing/backlog counts
- scheduler queues/running counts and worker capacity

Render second. The renderer may use Bijou components, but it must accept
the model as input and produce deterministic text for tests and
pipe-mode output.

# Explicit non-goals

- no governed write/edit work
- no WARP/LSP/provenance expansion
- no new daemon semantics unless a small read-side adapter is required
  to expose existing status truth
- no interactive mutating daemon actions in this slice
