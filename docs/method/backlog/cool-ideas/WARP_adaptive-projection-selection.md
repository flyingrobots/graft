---
title: "Adaptive projection selection"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Outline projection (shipped)"
  - "Content, range, diff, and map projections (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Given a file and task context, the system selects the projection that minimizes structural curvature"
  - "Dense utility files default to outline; thin config files default to content"
  - "Single-function investigation defaults to range; version comparison defaults to diff"
  - "Projection selection is structural (graph-derived), not threshold-based"
  - "The selected projection can be overridden by an explicit user/agent request"
  - "A test verifies that a high-complexity file selects outline over content"
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
