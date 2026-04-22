---
title: "Governed write tools"
legend: SURFACE
lane: v0.7.0
requirements:
  - "graft_edit MCP tool exists (governed-edit)"
acceptance_criteria:
  - "Full governed write surface with write policy enforcement"
  - "Provenance tracking for which tool/session wrote what"
  - "Causal write events emitted for all governed writes"
blocked_by:
  - SURFACE_agent-dx-governed-edit
---

# Governed write tools

## Why

Graft governs reads to prevent context bloat. But the write side has no
policy surface. Agents use native Edit/Write tools which require a prior
native Read — creating friction when graft's governed reads block the
Read tool for large files.

A graft-provided edit tool would:
- Accept `read_range` evidence instead of requiring native `Read`
- Respect `.graftignore` (refuse writes to ignored paths)
- Enforce write policy (prevent writes to lockfiles, build output, etc.)
- Close the read→edit loop entirely within graft's policy boundary

## Possible shapes

1. **Minimal**: `graft_edit` — path + old_string + new_string, validates
   old_string exists, no prior Read required
2. **Full**: governed write surface with write policy, provenance
   tracking (which tool/session wrote what), and causal write events
