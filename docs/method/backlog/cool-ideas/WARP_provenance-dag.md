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
