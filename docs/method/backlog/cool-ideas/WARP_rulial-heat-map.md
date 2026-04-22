---
title: "Rulial heat map"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Per-branch worldlines (backlog)"
  - "Structural diff infrastructure (shipped)"
acceptance_criteria:
  - "Given two branches, produces a per-symbol divergence score (agreement, local alteration, cascading divergence, catastrophic bifurcation)"
  - "Divergence scores are derived from structural comparison, not text diff"
  - "Output can be rendered as a visual heatmap (cool blue to white-hot)"
  - "PR review can answer 'where is this PR structurally dangerous?' from the heatmap alone"
---

# Rulial heat map

Overlay two branches' structural worldlines and produce divergence
intensity per symbol. Not text diff — semantic divergence scores.

Cool blue = structural agreement. Orange = local alteration.
Red = cascading structural divergence. White-hot = catastrophic
structural bifurcation.

Debugging and code review become reading geometry, not reading
logs. "Where is this PR structurally dangerous?" has a visual
answer.

Depends on: WARP Level 1 (shipped), per-branch worldlines
(backlog), structural diff infrastructure.
