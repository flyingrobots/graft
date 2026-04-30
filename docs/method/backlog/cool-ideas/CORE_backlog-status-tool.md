---
title: "graft backlog-status — feature completion tracking as a tool"
feature: surface
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Backlog cards with frontmatter (shipped)"
  - "Retro docs (shipped)"
acceptance_criteria:
  - "A 'graft backlog-status' command reads card frontmatter and retro existence"
  - "Produces the feature menu (done/remaining/blocked per feature) automatically"
  - "No more Python scripts for backlog status"
---

# graft backlog-status — feature completion tracking

We keep rebuilding Python scripts to produce the feature menu.
Make it a graft tool that reads card frontmatter, checks retro
existence, and produces the status table automatically.
