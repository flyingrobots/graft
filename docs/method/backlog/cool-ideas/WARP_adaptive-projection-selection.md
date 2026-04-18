---
title: "Adaptive projection selection"
---

# Adaptive projection selection

Graft's outline projection is not convenience — it is a
representation change that collapses computational complexity
(NP collapse from AION Paper 10).

The WARP graph could auto-detect which projection minimizes
structural curvature for the agent's current task and select it
automatically.

- Reading a dense utility file? Outline.
- Reading a thin config file? Content.
- Investigating a bug in one function? Range.
- Comparing two versions? Diff.
- Exploring a new codebase? Map.

The choice should be structural, not threshold-based. The WARP
graph knows the curvature. Graft picks the geodesic.

Depends on: WARP Level 1 (shipped), refactor difficulty score,
horizon of readability.
