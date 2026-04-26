---
title: "Bijou TUI for Graft daemon control plane"
feature: daemon
kind: leaf
legend: SURFACE
lane: v0.7.0
requirements:
  - "Daemon control plane exists (shipped)"
  - "Bijou TUI framework exists (shipped)"
acceptance_criteria:
  - "graft daemon tui launches a terminal UI showing daemon state"
  - "Shows health, sessions, workspaces, monitors, worker pressure"
  - "Interactive actions: authorize/revoke workspace, pause/resume monitors"
---

# Bijou TUI for Graft daemon control plane

# Why

The daemon now has a real control plane, but human operators still have
to reconstruct state from separate CLI commands or raw MCP calls. Graft
already depends on `@flyingrobots/bijou` and `@flyingrobots/bijou-node`,
so there is a credible terminal-native path for a first-class daemon
manager without dropping into a browser or bespoke GUI.

# Desired end state

- define a Bijou-based terminal UI for daemon operations, likely behind
  an explicit command such as `graft daemon tui`
- the surface shows bounded summaries for daemon health, sessions,
  authorized workspaces, monitors, worker pressure, and readiness
- the surface keeps daemon posture obvious: socket path, bind posture,
  active sessions, failing monitors, and degraded states should be
  visible without opening raw JSON
- interactive actions stay narrow and operator-safe: authorize or revoke
  workspace, bind or inspect session posture, pause or resume monitors,
  and open supporting detail panes

# Acceptance sketch

- a human can launch one terminal command and understand what the daemon
  is doing right now
- the layout makes daemon-only concepts legible instead of forcing
  mental joins across `daemon_status`, `daemon_sessions`,
  `workspace_authorizations`, and `daemon_monitors`
- the first version remains same-user local and grounded in existing
  control-plane truth
