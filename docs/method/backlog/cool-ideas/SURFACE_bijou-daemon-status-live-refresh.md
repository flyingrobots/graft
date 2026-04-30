---
title: "Bijou daemon status live refresh"
feature: daemon
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "Bijou daemon status first slice (shipped)"
acceptance_criteria:
  - "Daemon status view can refresh at a bounded interval without restarting the command"
  - "Refresh cadence, last-updated time, and stale/degraded state are visible"
  - "Refresh can target the default daemon socket and explicit --socket"
  - "Rendering remains read-only and does not add daemon mutating actions"
  - "Tests use deterministic model snapshots or fake time instead of a live terminal loop"
---

# Bijou daemon status live refresh

## Why

The first daemon status slice should be deliberately read-only and
deterministic. Once that model and renderer exist, operators will want
the same posture to update while they watch active sessions, monitor
health, scheduler pressure, and worker pressure change.

## Shape

- add bounded polling or an equivalent refresh loop over the daemon
  status model
- show last refresh time and stale/degraded state
- preserve pipe/test determinism by keeping refresh orchestration
  separate from model construction and single-frame rendering
- keep the surface read-only

## Non-goals

- no authorize/revoke/bind/rebind actions
- no monitor pause/resume/start/stop actions
- no new daemon semantics beyond reading existing status surfaces
