---
title: "Bijou daemon status first slice"
legend: "SURFACE"
cycle: "SURFACE_bijou-daemon-status-first-slice"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/SURFACE_bijou-daemon-status-first-slice.md"
---

# Bijou daemon status first slice

Source backlog item: `docs/method/backlog/v0.7.0/SURFACE_bijou-daemon-status-first-slice.md`
Legend: SURFACE

## Hill

Ship a read-only `graft daemon status` CLI surface over existing daemon
read-side truth. The cycle is complete when the command can inspect an
already-running daemon through the default socket or an explicit
`--socket`, build a deterministic daemon status model, and render a
human-friendly terminal view without adding live refresh, keyboard
navigation, or mutating daemon actions.

## Playback Questions

### Human

- [ ] lets an operator run graft daemon status --socket and see daemon
      health sessions workspace posture monitors scheduler pressure and
      worker pressure without raw JSON
- [ ] daemon status renders read-only output without daemon action
      affordances

### Agent

- [ ] buildDaemonStatusModel normalizes daemon read truth before
      rendering
- [ ] renderDaemonStatus is deterministic without a live terminal
- [ ] graft daemon status fails clearly when no daemon is listening

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the command renders a
  single-frame text status with explicit rows for runtime, sessions,
  workspaces, monitors, scheduler, and workers.
- Non-visual or alternate-reading expectations: the model is plain
  structured data and the renderer degrades through Bijou's pipe-safe
  table output, so logs and screen-reader-oriented transcripts preserve
  the same facts.

## Localization and Directionality

- Locale / wording / formatting assumptions: labels are English
  operator terms, counts are base-10 integers, timestamps remain ISO
  strings from daemon read surfaces.
- Logical direction / layout assumptions: output is left-to-right and
  single-column outside the Bijou table boundary.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: status model
  construction must be separate from rendering, and optional read
  surfaces must degrade to `unknown` instead of invented values.
- What must be attributable, evidenced, or governed: all status facts
  must come from existing daemon read surfaces:
  `daemon_status`, `daemon_sessions`, `daemon_repos`,
  `daemon_monitors`, `workspace_status`, and
  `workspace_authorizations`.

## Non-goals

- [ ] No live refresh or watch loop.
- [ ] No keyboard navigation or pane switching.
- [ ] No authorize/revoke/bind/rebind operations.
- [ ] No monitor pause/resume/start/stop operations.
- [ ] No governed write/edit work.
- [ ] No WARP/LSP/provenance expansion.

## Backlog Context

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
