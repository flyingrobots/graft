---
title: "graft backlog-status - feature completion tracking as a tool"
feature: surface
kind: leaf
legend: CORE
lane: graveyard
effort: S
release_scope: v0.8.0-candidate
requirements:
  - "Backlog cards with frontmatter (shipped)"
  - "Retro docs (shipped)"
acceptance_criteria:
  - "A 'graft backlog-status' command reads card frontmatter and retro existence"
  - "Produces the feature menu (done/remaining/blocked per feature) automatically"
  - "No more Python scripts for backlog status"
---

# graft backlog-status - feature completion tracking

## Disposition

Canceled for Graft and moved to the graveyard.

Rationale: METHOD-specific backlog/status surfaces do not belong in
Graft. Graft must remain repo-generic and useful on any Git repository;
METHOD backlog lanes, cards, retros, dependency DAGs, and release
truth surfaces belong in Method MCP / Method CLI.

The abandoned `cycle/CORE_backlog-status-tool` branch may be mined as
prototype material for Method, but it must not be merged into Graft.

## Original Proposal

We keep rebuilding Python scripts to produce the feature menu.
Make it a graft tool that reads card frontmatter, checks retro
existence, and produces the status table automatically.

## v0.8.0 scope note

This is the first proposed v0.8.0 scope-forming card. Pull it next as a
normal METHOD cycle before implementation. Keep the first slice focused
on a deterministic model and CLI rendering over checked-in backlog,
design, retro, and dependency metadata.
