---
title: "Provenance DAG"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Agent action provenance (backlog)"
acceptance_criteria:
  - "Observations are stored as DAG nodes with causal dependency edges (read X before writing Y)"
  - "Each node records what was read, the projection chosen, and alternatives that existed"
  - "The DAG can be traversed backwards from a write to reconstruct the full causal chain of reads that informed it"
  - "DAG size is bounded by structural universe sharing (not exponential in observation count)"
  - "A staleness bug can be diagnosed by replaying the DAG: identifying where an agent read stale data"
---

# Provenance DAG

Evolve receipts from flat NDJSON into a graph of structural
observations.

Each node: what was read, what projection was chosen, what
alternatives existed. Each edge: causal dependency (read X
before writing Y).

The agent's entire reasoning trace is a DAG of structural
observations. Debug the agent by replaying its observation
history. "It read the old signature at tick 5, then wrote a
call using it at tick 7. The signature changed at tick 6. The
agent's code is stale."

Self-compressing: structural universes share state. The
provenance DAG is bounded, not exponential.

Depends on: WARP Level 1 (shipped), agent action provenance
(backlog).
