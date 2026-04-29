---
title: "Governed write tools"
feature: agent-safety
kind: trunk
legend: SURFACE
lane: v0.7.0
requirements:
  - "graft_edit MCP tool exists (governed-edit)"
acceptance_criteria:
  - "Full governed write surface with write policy enforcement"
  - "Provenance tracking for which tool/session wrote what"
  - "Causal write events emitted for all governed writes"
---

# Governed write tools

## Why

Graft governs reads to prevent context bloat. But the write side has no
policy surface. Agents use native Edit/Write tools which require a prior
native Read — creating friction when graft's governed reads block the
Read tool for large files.

The minimal `graft_edit` first slice now exists. The remaining work is the
broader governed write surface:

- Accept `read_range` evidence instead of requiring native `Read`
- Enforce a fuller write policy beyond the first slice's exact-replacement
  and hard-denial checks
- Track which tool/session wrote what
- Emit causal write events for governed writes

## Possible shapes

1. **Minimal**: `graft_edit` — shipped as an exact replacement MCP tool.
2. **Full**: governed write surface with write policy, provenance
   tracking (which tool/session wrote what), and causal write events
