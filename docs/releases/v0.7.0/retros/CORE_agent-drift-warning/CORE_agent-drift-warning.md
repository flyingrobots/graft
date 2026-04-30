---
title: "Agent drift warning"
cycle: "CORE_agent-drift-warning"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_agent-drift-warning.md"
outcome: hill-met
drift_check: yes
---

# Agent drift warning Retro

## Summary

Closed CORE_agent-drift-warning after shipping the narrowed graft_edit-only advisory drift warning. The warning is session-local, advisory-only, limited to jsdoc_typedef reintroduction after same-session removal, schema-validated through graft_edit driftWarnings, and explicitly avoids causal write provenance, persisted write history, native Edit/Write interception, daemon, WARP, LSP, and provenance expansion. Drift was clean and witness captured Dockerized validation.

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/CORE_agent-drift-warning/witness`.
The witness maps the playback checklist to the focused
`test/unit/mcp/graft-edit-drift-warning.test.ts` cases covering advisory-only
warnings, edit success, same-session scope, separate-session silence,
`jsdoc_typedef`-only classification, and absence of provenance/native
interception/daemon/WARP/LSP expansion.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
