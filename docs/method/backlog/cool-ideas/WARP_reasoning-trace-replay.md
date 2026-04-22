---
title: "Reasoning trace replay"
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
