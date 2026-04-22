---
title: "CI-001 — Causal Collapse Visualizer"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Worldline/Strand causal model (not shipped)"
  - "Graph-export API for causal worldlines (not shipped)"
acceptance_criteria:
  - "A CLI or web visualizer renders the branching worldlines of a session"
  - "HEAD anchor is visually distinguished in the output"
  - "Speculative strands (agent/human) are shown as separate branches"
  - "Collapse decision boundaries are highlighted at staged-target vs. canonical-commit points"
  - "Output is generated from live WARP graph data, not mocked"
---

# CI-001 — Causal Collapse Visualizer

Legend: [WARP — Structural Memory](../../legends/WARP-structural-memory.md)

## Idea

As Graft moves toward strand-aware causal collapse, understanding which speculative events are "admitted" into canonical history becomes complex.

Create a visualizer (either via CLI braille-charts or a local web surface) that shows the branching "Worldlines" of a session. It should highlight:
- The `HEAD` anchor.
- Speculative "Strands" (agent/human activity).
- The "Collapse" decision boundaries (staged targets vs. canonical commits).

## Why

1. **Observability**: Makes the "Warp" ontology concrete and inspectable.
2. **Trust**: Allows builders to verify that the collapse logic is only admitting relevant causal slices.
3. **Differentiation**: Shows Graft's superiority over line-oriented Git by visualizing structural provenance.

## Effort

Large — requires a stable graph-export API and a layout engine for causal worldlines.
