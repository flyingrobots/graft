---
title: "Bijou daemon control-plane actions"
feature: daemon
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: L
requirements:
  - "Bijou daemon status first slice (shipped)"
  - "Daemon workspace and monitor mutation tools (shipped)"
acceptance_criteria:
  - "Operator actions are explicit and confirmation-gated"
  - "Workspace authorize/revoke/bind/rebind actions use existing daemon MCP tools"
  - "Monitor pause/resume/start/stop actions use existing daemon MCP tools"
  - "Action model is testable separately from terminal key handling"
  - "Failures preserve daemon error codes and next-step guidance"
  - "No governed write/edit surface is introduced"
---

# Bijou daemon control-plane actions

## Why

The daemon already exposes mutation tools for workspace authorization,
workspace binding, and monitor lifecycle management. Those tools should
eventually be reachable from the terminal control plane, but only after
the read-only status surface is boring, tested, and documented.

## Shape

- add a small action model over the existing daemon mutation tools
- require explicit confirmation for every mutating operation
- keep terminal key handling separate from action construction and
  execution
- surface daemon error codes and recovery guidance without hiding the
  underlying MCP tool behavior

## Non-goals

- no governed write/edit operations
- no WARP/LSP/provenance expansion
- no implicit workspace authorization or monitor mutation
