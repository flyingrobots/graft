---
title: Provenance DAG
legend: WARP
lane: cool-ideas
effort: L
blocked_by:
  - WARP_agent-action-provenance
blocking:
  - WARP_reasoning-trace-replay
  - WARP_causal-blame-for-staged-artifacts
requirements:
  - WARP Level 1 indexing (shipped)
  - Session tracking (shipped)
  - Agent action provenance (backlog)
acceptance_criteria:
  - Observations are stored as DAG nodes with causal dependency edges (read X before writing Y)
  - Each node records what was read, the projection chosen, and alternatives that existed
  - The DAG can be traversed backwards from a write to reconstruct the full causal chain of reads that informed it
  - DAG size is bounded by structural universe sharing (not exponential in observation count)
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

## Implementation path

1. Design the DAG node schema: each node captures the observation
   (file, symbol, projection chosen, alternatives available,
   tick, session, agent ID).
2. Design the DAG edge schema: causal edges link reads to
   subsequent writes, temporal edges capture ordering within a
   session.
3. Migrate observation storage from flat NDJSON receipts to the
   DAG structure, preserving backward compatibility for existing
   receipt consumers.
4. Implement backward traversal: given a write node, walk causal
   edges backward to reconstruct the full read chain that
   informed it.
5. Implement structural universe sharing: DAG nodes that refer to
   the same structural state share the underlying data (similar to
   git's object model), bounding storage cost.
6. Build staleness detection: compare the structural state at read
   time vs. current state, flag nodes where the agent acted on
   stale data.

## Why blocked by agent-action-provenance

The provenance DAG structures the data that agent-action-provenance
produces. Without agent-action-provenance recording reads and
writes as WARP observation/mutation nodes, there is nothing to
organize into a DAG. Agent-action-provenance defines the node
types (observation, mutation) and their basic causal linking;
the provenance DAG evolves that into a full graph with traversal,
compression, and staleness detection.

## Why blocks reasoning-trace-replay

Reasoning trace replay walks the provenance DAG backward from a
write to reconstruct the agent's reasoning path. Without the DAG
structure, replay would have to work from flat receipts with no
causal edges -- possible but far less powerful. The DAG is the
data structure that makes replay meaningful.

## Related cards

- **WARP_agent-action-provenance** (blocked_by -- hard dep):
  Provides the raw observation/mutation nodes. See above.
- **WARP_reasoning-trace-replay** (blocking -- hard dep):
  Consumes the DAG for replay. See above.
- **WARP_causal-write-tracking**: Causal write tracking records
  write observations and links them to preceding reads. This
  overlaps heavily with what provenance DAG structures. However,
  causal-write-tracking focuses on the write-interception
  mechanism (hooks on Edit tool), while provenance DAG focuses on
  the data structure that organizes those links. They are
  complementary -- causal-write-tracking produces the edges,
  provenance DAG provides the queryable structure. Not a hard dep
  because each can be built independently.
- **WARP_intent-and-decision-events**: Decision events enrich
  the DAG with non-read/write nodes (hypotheses, rejected
  alternatives). The DAG can exist without them and they can be
  added later. Not a hard dep.
- **WARP_semantic-drift-in-sessions**: Drift detection could use
  the DAG to identify loops in reading paths, but it currently
  depends only on observation cache and session tracking. Not a
  hard dep.

## Effort rationale

Large. Designing a DAG storage format that supports efficient
backward traversal, structural universe sharing for bounded
storage, and migration from flat NDJSON receipts is a significant
design and implementation effort. The staleness detection algorithm
adds complexity. However, it builds on existing observation
infrastructure (shipped session tracking, observation cache) rather
than requiring new substrate features, keeping it below XL.
