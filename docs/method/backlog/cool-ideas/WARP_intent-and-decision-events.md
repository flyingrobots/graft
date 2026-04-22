---
title: "WARP intent and decision events"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - WARP_agent-action-provenance
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Agent action provenance (backlog)"
acceptance_criteria:
  - "Agents can emit intent events (task goal, hypothesis) that are recorded in the WARP observation stream"
  - "Agents can emit decision events (rejected alternatives, checkpoint rationale) alongside read/write events"
  - "Decision events appear in causal slices, bridging otherwise disconnected read/write observations"
  - "Replaying an observation DAG with decision events produces a richer causal explanation than without"
  - "Human and agent decision events share a unified actor model"
---

# WARP intent and decision events

Read/write footprints alone will not fully explain why a human or
agent made a change.

Graft likely needs first-class optional WARP events for things like:
- declared task intent
- hypothesis shifts
- rejected alternatives
- decision checkpoints
- handoff notes that should become part of causal provenance

Example:
- agent reads `server.ts`
- agent reads `policy.ts`
- agent decides "the bug is actually in policy gating"
- agent edits only `policy.ts`

Without the decision checkpoint, the causal chain is weaker than the
real reasoning.

Why it matters:
- agents are users too; they need a way to preserve reasons without
  relying on chat logs as the only source of truth
- humans auditing agent work need more than file-touch chronology
- causal slices get sharper when decision events can bridge otherwise
  disconnected read/write events

Open questions:
- should intent / decision events be explicit surfaces, inferred from
  tool calls, or both
- should payloads be free text, structured enums, or a layered model
- when should these events collapse into canonical provenance versus
  remain strand-local
- how should human and agent decisions share one actor model

## Implementation path

1. Define decision event node types: intent (task goal, hypothesis),
   decision (rejected alternative, checkpoint), handoff (notes for
   the next agent/human). Each type shares the base observation
   schema (tick, session, agent ID) from agent-action-provenance
   but carries a different payload.
2. Add a `causal_decide` tool (or extend `causal_attach`) that
   agents call to emit decision events. The tool accepts a type
   (intent/decision/handoff) and a payload (free text initially,
   structured later).
3. Wire decision events into the causal edge model: a decision
   node is causally downstream of the reads that informed it and
   causally upstream of the writes it motivated. This bridges the
   gap between "read A, read B, wrote C" and "read A, read B,
   decided X, wrote C."
4. Implement the unified actor model: both agents and humans can
   emit decision events. The actor field distinguishes them. Human
   events could be emitted via a CLI command (`graft decide "..."`)
   or via editor integration.
5. Ensure decision events enrich but do not break existing causal
   slices — a slice computed without decision events is a subset
   of the slice computed with them.

## Why blocked by agent-action-provenance

Decision events are a new node type in the observation/mutation
schema that agent-action-provenance defines. They share the base
node structure (tick, session, agent ID, causal edges) and must
interleave correctly with observation and mutation nodes in the
causal chain. Without the foundational node types and causal edge
model from agent-action-provenance, decision events would have no
schema to extend and no causal chain to insert into.

## Related cards

- **WARP_agent-action-provenance** (blocked_by — hard dep):
  Defines the observation/mutation node types and causal edge
  model that decision events extend. See above.
- **WARP_provenance-dag**: The DAG structures all nodes (including
  decision events) into a traversable graph. Decision events are
  DAG nodes like any other. Not a hard dep — the DAG can exist
  without decision events, and decision events can be stored
  without the DAG (as flat entries in the observation stream).
- **WARP_reasoning-trace-replay**: Replay benefits from decision
  events (richer traces) but works without them. Not a hard dep.
- **WARP_causal-blame-for-staged-artifacts**: Causal blame could
  include decision events in its slices, giving better "why"
  answers. Complementary but independent.
- **SURFACE_attach-to-existing-causal-session**: Attaching to an
  existing session means inheriting its decision context. Decision
  events would make that context explicit. Complementary.
- **CORE_agent-handoff-protocol**: Handoff notes are a type of
  decision event. The handoff protocol could emit them
  automatically. Complementary but independent.

## Effort rationale

Medium. The node type design is bounded — it extends the existing
observation schema rather than creating new infrastructure. The
causal edge wiring is the main complexity: decision nodes sit
between reads and writes in the causal chain, which requires
careful temporal ordering. The unified actor model needs design
but not new storage. The `causal_decide` tool is a thin surface
over the observation stream. M, not S, because the causal edge
insertion logic and actor model unification require deliberate
design work.
