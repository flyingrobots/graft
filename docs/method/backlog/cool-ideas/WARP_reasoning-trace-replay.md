---
title: "Reasoning trace replay"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - WARP_provenance-dag
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Agent action provenance (backlog)"
  - "Provenance DAG (backlog)"
acceptance_criteria:
  - "An agent's reads and writes are recorded as WARP observations with temporal ordering"
  - "Walking the observation DAG backwards from a write reconstructs the reasoning path that led to it"
  - "Replay detects staleness: identifies when an agent acted on data that changed between read and write"
  - "Replay output is human-readable, showing tick-by-tick structural observations with causal links"
---

# Reasoning trace replay

Record agent reads and writes as WARP observations. Replay the
agent's reasoning by walking its observation DAG backwards.

"The agent read server.ts at tick 5, saw the old signature.
Wrote a call using it at tick 7. Someone changed the signature
at tick 6. The agent's code is stale because it never re-read."

Debugging agent work by replaying structural observations.
The worldline IS the debug trace.

Depends on: WARP Level 1 (shipped), agent action provenance
(backlog), provenance DAG (backlog).

## Implementation path

1. Define the replay query interface: given a write (mutation node
   or commit+symbol), walk the provenance DAG backward to collect
   all causally upstream observation nodes.
2. Build the causal chain renderer: serialize the DAG walk into a
   human-readable, tick-ordered trace showing each observation
   (what was read, what projection, what structural state) and each
   mutation (what was written, what changed).
3. Implement staleness detection: for each observation in the
   chain, compare the structural state at read-time against the
   state at the time of the subsequent write. Flag observations
   where the underlying data changed between read and write
   (the agent acted on stale information).
4. Add inter-agent staleness: detect cases where Agent B's write
   invalidated the structural state that Agent A had already read,
   making Agent A's subsequent write stale.
5. Output format: structured JSON for programmatic consumption,
   plus a Markdown-rendered summary for human review. Include
   a staleness severity indicator (stale-but-harmless vs.
   stale-and-semantic-change).

## Why blocked by provenance-dag

Reasoning trace replay IS a DAG walk. It traverses the provenance
DAG backward from a write to reconstruct the full causal chain of
reads. Without the DAG structure (causal edges between observation
and mutation nodes, temporal ordering, structural universe sharing),
replay would have to work from flat NDJSON receipts with no causal
edges. That version already exists as `CORE_structural-session-replay`
(a simpler, receipt-based replay). This card specifically provides
the DAG-powered version with causal reasoning and staleness
detection, which requires the DAG to exist.

## Related cards

- **WARP_provenance-dag** (blocked_by — hard dep): Provides the
  DAG data structure this card traverses. See above.
- **WARP_agent-action-provenance**: Produces the observation and
  mutation nodes that populate the DAG. Indirect dependency
  (through provenance-dag), not a direct one.
- **CORE_structural-session-replay**: The simpler, shippable-now
  version of replay that works from flat NDJSON receipts. This
  card is the DAG-powered upgrade. Not dependent in either
  direction — they serve different fidelity levels and can coexist.
- **WARP_intent-and-decision-events**: Decision events would
  enrich the replay trace with "why" context (hypotheses, rejected
  alternatives) between the read/write nodes. The replay works
  without them but becomes more explanatory with them. Not a hard
  dep.
- **WARP_semantic-drift-in-sessions**: Drift detection identifies
  re-reads where interpretation may have shifted. Replay could
  surface these as annotations ("holonomy warning: agent re-read
  after context shift"). Complementary but independent.
- **CI-002-deterministic-scenario-replay**: Deterministic replay
  re-drives the runtime against mocks for CI regression testing.
  Reasoning trace replay renders the causal chain for human
  understanding. Different goals, shared name collision.

## Effort rationale

Medium. The core work is the DAG traversal algorithm and the
staleness detection comparator. The DAG structure itself is
provided by `WARP_provenance-dag` — this card consumes it, not
builds it. The renderer (JSON + Markdown) is straightforward.
Staleness detection requires comparing structural snapshots at
two points in time, which the WARP graph already supports via
worldline seek. M, not L, because the hard infrastructure (DAG,
nodes, edges) is built by upstream cards.
