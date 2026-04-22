---
title: "Governed edit tool for agent DX"
legend: SURFACE
lane: v0.7.0
requirements:
  - "Governed read hooks exist (shipped)"
  - "read_range tool exists (shipped)"
acceptance_criteria:
  - "graft_edit MCP tool accepts path + old_string + new_string"
  - "Accepts read_range evidence instead of requiring native Read"
  - "Respects .graftignore and records edit in causal provenance"
blocks:
  - SURFACE_governed-write-tools
---

# Governed edit tool for agent DX

## Problem

Graft's governed read hooks block native `Read` on large files, redirecting agents to `read_range`/`file_outline`. But the native `Edit` and `Write` tools require a prior native `Read` call as a safety check. This creates a catch-22: the agent can't read the file (governed) and therefore can't edit it (harness blocks).

Current workarounds are ugly: `cat` via Bash to satisfy the read prerequisite, or `sed` for inline edits. These bypass the governance boundary entirely.

## Agent DX impact

This friction hits every editing workflow. Agents waste tokens on workarounds, lose the audit trail that governed reads provide, and sometimes make mistakes with sed that require cleanup.

## Proposed shape

A `graft_edit` MCP tool that:
- Accepts `path`, `old_string`, `new_string` (like the native Edit tool)
- Accepts `read_range` evidence instead of requiring native `Read`
- Respects `.graftignore` (refuse edits to ignored paths)
- Records the edit in the causal provenance footprint
- Could enforce write policy (prevent edits to lockfiles, build output, etc.)

This closes the read-edit loop entirely within graft's policy boundary. See also: `SURFACE_governed-write-tools.md` for the broader write-governance vision.
