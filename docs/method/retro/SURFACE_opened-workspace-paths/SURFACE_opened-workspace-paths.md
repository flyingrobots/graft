---
title: "Opened workspace paths"
cycle: "SURFACE_opened-workspace-paths"
design_doc: "docs/design/SURFACE_opened-workspace-paths.md"
outcome: hill-met
drift_check: yes
---

# Opened workspace paths Retro

## Summary

Opened workspace paths shipped as a first-class MCP surface. Repo-local sessions can open another git worktree path, list opened workspaces, inspect workspace status, and activate the opened path without restarting or adding cwd envelopes to repo-scoped tools. Daemon workspace_open now writes through the existing authorization registry and preserves capability posture before binding.

## Playback Witness

Artifacts under `docs/method/retro/SURFACE_opened-workspace-paths/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
