---
title: "CI-001 — Causal Collapse Visualizer"
feature: provenance
kind: leaf
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Worldline/Strand causal model (not shipped — git-warp substrate)"
  - "Graph-export API for causal worldlines (not shipped)"
  - "Agent action provenance with observation/mutation nodes (backlog)"
acceptance_criteria:
  - "A CLI or web visualizer renders the branching worldlines of a session"
  - "HEAD anchor is visually distinguished in the output"
  - "Speculative strands (agent/human) are shown as separate branches"
  - "Collapse decision boundaries are highlighted at staged-target vs. canonical-commit points"
  - "Output is generated from live WARP graph data, not mocked"
blocked_by:
  - WARP_agent-action-provenance
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

## Implementation path

1. Define a graph-export API that serializes WARP worldlines into a renderable format (node list + edge list with strand/collapse metadata).
2. Build a CLI renderer using braille-chart or box-drawing characters that lays out worldline branches vertically with temporal flow.
3. Annotate HEAD anchor, strand origins, and collapse boundaries with distinct markers.
4. Add optional HTML/SVG render mode for richer visualization (stretch goal).
5. Wire as a `graft visualize <session-id>` command that reads from the WARP graph.

## Related cards

- **WARP_agent-action-provenance** (blocked_by — hard dep): The visualizer renders observation and mutation nodes as the content of worldlines. Without provenance nodes, the worldlines are empty structural shells with no agent activity to show. The visualizer needs the observation/mutation node types and their causal edges to render meaningful branching strands.
- **WARP_provenance-dag**: The provenance DAG organizes observations into a queryable graph structure. The visualizer could consume the DAG directly for layout. However, the visualizer's core need is the graph-export API for worldlines (which is a separate concern from the flat-receipt-to-DAG migration). Not a hard dep — the visualizer can work from raw WARP graph data without the DAG abstraction.
- **WARP_reasoning-trace-replay**: Replay walks the causal chain; the visualizer renders it spatially. Complementary outputs from the same underlying data. No dependency in either direction.
- **CORE_structural-session-replay**: Structural replay renders sessions as a textual walkthrough from NDJSON receipts. The visualizer renders sessions as a graphical worldline diagram from WARP graph data. Different fidelity levels and different data sources. No dependency.
- **WARP_shadow-structural-workspaces**: Shadow workspaces create isolated strands per agent. The visualizer would show those strands. But the visualizer can render any worldline structure, not just shadow workspaces. No dependency.

## Why blocked by agent-action-provenance

The causal collapse visualizer renders the branching worldlines of a session — specifically, the observation and mutation nodes that populate those worldlines and the causal edges between them. Agent-action-provenance defines the node types (observation, mutation), their schema, and the causal linking model. Without those primitives, the visualizer would have nothing meaningful to render on the worldline branches — just empty structural timeline without agent activity.

## Effort rationale

Large. Requires: (a) a graph-export API that serializes WARP worldlines into a renderable format, (b) a layout engine that handles branching strands with varying merge/collapse topologies, and (c) either a CLI renderer with box-drawing or a web renderer with SVG. The layout engine for branching DAGs is the hardest part — similar complexity to `git log --graph` but with richer semantics (strands, collapse boundaries, observation types).
