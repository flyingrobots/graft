---
title: "Governed edit tool for agent DX"
cycle: "SURFACE_agent-dx-governed-edit"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/SURFACE_agent-dx-governed-edit.md"
outcome: hill-met
drift_check: yes
---

# Governed edit tool for agent DX Retro

## Summary

Closed SURFACE_agent-dx-governed-edit after shipping the narrowed graft_edit MCP first slice. The implementation provides exact single-replacement editing through Graft using path confinement, the filesystem port, existing policy refusals, schema-validated output, and runtime completion-footprint observability only. Playback verifies no Buffer usage or direct node:fs usage in graft_edit, ctx.resolvePath and ctx.fs routing, exact replacement behavior, refusal/no-create behavior, no broader write operations, and no provenance overclaim. No read_range evidence attestation, full governed write surface, drift warning, daemon, WARP, LSP, or provenance expansion was included.

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/SURFACE_agent-dx-governed-edit/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
