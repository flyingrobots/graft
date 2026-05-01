---
title: "graft backlog-status - feature completion tracking as a tool"
feature: surface
kind: leaf
legend: CORE
lane: asap
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

We keep rebuilding Python scripts to produce the feature menu.
Make it a graft tool that reads card frontmatter, checks retro
existence, and produces the status table automatically.

## v0.8.0 scope note

This is the first proposed v0.8.0 scope-forming card. Pull it next as a
normal METHOD cycle before implementation. Keep the first slice focused
on a deterministic model and CLI rendering over checked-in backlog,
design, retro, and dependency metadata.
