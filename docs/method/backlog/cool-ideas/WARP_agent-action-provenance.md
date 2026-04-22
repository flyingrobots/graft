---
title: "WARP: Agent action provenance (Level 3)"
legend: WARP
lane: cool-ideas
effort: XL
blocking:
  - WARP_provenance-dag
  - WARP_causal-write-tracking
  - WARP_intent-and-decision-events
  - CI-001-causal-collapse-visualizer
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Hooks integration for write interception (backlog)"
  - "Sub-commit WARP nodes (backlog — persisted sub-commit local history)"
  - "Provenance attribution instrumentation (backlog)"
acceptance_criteria:
  - "Agent reads are recorded as WARP observation nodes linked to file, commit, and agent ID"
  - "Agent writes are recorded as WARP mutation nodes linked to symbol, commit, and preceding observation"
  - "The causal chain from a write can be walked backward to the reads that informed it"
  - "Multi-agent sessions produce distinct, interleaved observation chains"
  - "Observation storage cost scales sub-linearly with tool-call frequency (not one node per keystroke)"
  - "A test verifies that a read-then-write sequence produces a connected observation-mutation chain"
---

# WARP: Agent action provenance (Level 3)

Record agent reads and writes as WARP observations linked to
commits, files, and symbols. The causal chain of what the agent
saw before it wrote becomes the reasoning trace.

Possible graph shape:

  observation:uuid ─[reads]→ file:path
                  ─[at]→    commit:sha
                  ─[by]→    agent:id
                  intent: "why the agent read this"

  mutation:uuid ─[writes]→ sym:path:name
               ─[after]→  observation:uuid
               ─[at]→     commit:sha
               rationale: "why the agent changed this"

Open questions:
- Granularity: per-tool-call or per-session?
- Rationale capture: free text? structured? optional?
- Human writes: how to capture edits not made through agent tools?
- Storage cost: observations are high-frequency, need to be cheap
- Multi-agent: how do two agents' observation chains interleave?

This is the bridge from "what the code looks like" to "why the
code looks this way." Design cycle before any code.

## Implementation path

1. Design the observation/mutation node schema: define node types,
   required fields (file, symbol, projection, tick, session, agent
   ID), and optional fields (intent, rationale).
2. Design the causal edge model: read→write edges with temporal
   ordering, multi-agent interleaving rules (distinct chains that
   share timeline ticks but not causal ancestry).
3. Instrument read-path tools (safe_read, file_outline, code_show,
   code_find, code_refs) to emit observation nodes. Each tool call
   produces one observation, not one per symbol — this is the
   sub-linear storage constraint.
4. Instrument write-path tools (or write-interception hooks) to
   emit mutation nodes linked back to the most recent relevant
   observation(s) for the same file/symbol scope.
5. Build backward traversal: given a mutation node, walk causal
   edges backward to reconstruct the full observation chain.
6. Implement storage efficiency: share structural state across
   observations that reference the same file at the same commit
   (structural universe sharing). Compact high-frequency observation
   bursts into session-scoped summaries.
7. Multi-agent support: ensure observation chains from concurrent
   agents in the same session are interleaved correctly, with
   distinct agent IDs and no cross-contamination of causal links.

## Why this blocks provenance-dag and causal-write-tracking

Both `WARP_provenance-dag` and `WARP_causal-write-tracking` depend
on the observation and mutation node types defined here. The
provenance DAG organizes these nodes into a queryable graph
structure; causal write tracking specializes the write-side
observation mechanism. Without the node schema and causal edge
model from this card, both downstream cards would have to reinvent
these primitives independently.

## Related cards

- **WARP_provenance-dag** (blocking — hard dep): Structures the
  observation/mutation nodes this card produces into a DAG with
  traversal and compression. This card defines the nodes; the
  DAG card defines the graph over them.
- **WARP_causal-write-tracking** (blocking — hard dep): Specializes
  write-side observation with hooks on the Edit tool. Depends on
  the mutation node type and causal edge model defined here.
- **WARP_intent-and-decision-events**: Decision events (hypotheses,
  rejected alternatives) would be a new node type alongside
  observations and mutations. They enrich the causal chain but are
  not required for the base provenance model. Not a hard dep.
- **WARP_reasoning-trace-replay**: Replay walks the causal chain
  this card builds. But replay depends on the provenance DAG (which
  structures the chain), not directly on this card. Indirect
  dependency only.
- **WARP_causal-blame-for-staged-artifacts**: Causal blame computes
  a causal slice from the provenance data. It consumes what this
  card produces, but through the provenance DAG. Indirect.
- **CORE_structural-session-replay**: Session replay currently uses
  flat NDJSON receipts. It could migrate to observation nodes once
  this card ships, but works independently today. Not a hard dep.

## Effort rationale

XL. This card defines the foundational node types, causal edge
model, multi-agent interleaving semantics, and storage efficiency
constraints for all downstream provenance work. It requires:
instrumenting every read-path and write-path tool, designing a
storage format that scales sub-linearly with tool-call frequency,
solving multi-agent interleaving (distinct chains sharing a
timeline), and building backward traversal. Multiple backlog
prerequisites (hooks integration, sub-commit WARP nodes, provenance
attribution instrumentation) must also land. The scope is broader
and deeper than the L-effort downstream cards it enables.
