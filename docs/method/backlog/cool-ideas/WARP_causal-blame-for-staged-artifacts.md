---
title: "Causal blame for staged artifacts"
legend: WARP
lane: cool-ideas
effort: L
blocked_by:
  - WARP_provenance-dag
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "WARP graph ontology and causal collapse model (backlog)"
  - "Persisted sub-commit local history (backlog)"
  - "Provenance attribution instrumentation (backlog)"
acceptance_criteria:
  - "A surface (why_changed or stage-explain) returns the causal slice for a given staged file"
  - "The causal slice includes the reads, writes, and transitions that contributed to the staged change"
  - "Output is scoped to the specific staged target, not the full session replay"
  - "An agent can inspect causal blame before committing to verify correctness"
  - "A human can audit agent work via causal blame without reading the full session log"
  - "A test verifies that causal blame for a staged file traces back to the reads that informed the edit"
---

# Causal blame for staged artifacts

Humans and agents both need a direct answer to:

"Why did this staged file / symbol change happen?"

This is not ordinary structural blame. Structural blame answers which
commit last changed a symbol. Causal blame should answer which
between-commit reads, writes, decisions, and transitions contributed to
the currently staged artifact set.

Example:
- agent read `server.ts`
- agent read `policy.ts`
- agent edited `server.ts`
- branch switched
- agent re-read `server.ts`
- only `src/server.ts` was staged

Graft should be able to compute the causal slice for that staged target
and explain the change without replaying the full session.

Potential surface:
- `why_changed(path)`
- `graft stage-explain`
- a Git enhancement view over `git diff --cached`

Why it matters:
- agents need a precise way to inspect whether they are about to commit
  the right thing
- humans need a way to audit agent work without reading the entire chat
  or session replay
- this is the first user-facing payoff of strand collapse by causal
  slice

## Implementation path

1. Define the causal slice query: given a staged file path, identify
   all mutation nodes in the current session that touched that file
   (from the provenance DAG).
2. Walk backward from each mutation node through causal edges to
   collect the full upstream read chain — every observation that
   informed the writes to this file.
3. Include transition events (branch switches, resets) that occurred
   between reads and writes, as they affect which structural state
   the agent was operating on.
4. Scope the slice: prune nodes that are not causally upstream of
   the specific staged file. This is the difference from full
   session replay — causal blame is target-scoped.
5. Build the `why_changed(path)` tool surface: accepts a file path,
   returns the causal slice as structured JSON (for agents) and
   Markdown (for humans). Include a summary line: "This change was
   informed by reading X, Y, Z and deciding W."
6. Add a `graft stage-explain` CLI command that runs `why_changed`
   for every file in `git diff --cached` and produces a combined
   causal report.

## Why blocked by provenance-dag

Causal blame is a scoped DAG traversal. It walks the provenance
DAG backward from mutation nodes to their causal ancestors,
pruning to a target-specific slice. Without the DAG (causal edges
between observations and mutations, temporal ordering, backward
traversal API), causal blame would have to reconstruct causal
relationships from flat receipts — possible but fragile and
incomplete. The DAG provides the traversable structure that makes
scoped slicing reliable.

## Related cards

- **WARP_provenance-dag** (blocked_by — hard dep): Provides the
  DAG structure and backward traversal that causal blame queries.
  See above.
- **WARP_agent-action-provenance**: Produces the observation and
  mutation nodes that populate the DAG. Indirect dependency
  (through provenance-dag).
- **WARP_intent-and-decision-events**: Decision events would
  enrich the causal slice with "why" context. Without them, the
  slice shows reads→writes. With them, it shows
  reads→decisions→writes. Complementary but not required.
- **WARP_reasoning-trace-replay**: Replay walks the full causal
  chain for a write. Causal blame is a scoped version of the same
  walk, restricted to a staged file. They share traversal logic
  but serve different use cases (debugging vs. pre-commit audit).
  Not dependent in either direction.
- **SURFACE_governed-write-tools**: Governed writes could
  automatically invoke causal blame before committing, giving the
  agent a pre-commit audit. Complementary but independent.
- **CORE_structural-session-replay**: Session replay is the
  receipt-based, full-session version. Causal blame is the
  DAG-based, target-scoped version. Different fidelity and scope.

## Effort rationale

Large. The causal slice computation requires: scoped DAG traversal
with pruning (not just "walk backward" but "walk backward and
discard branches not causally upstream of the target"), transition
event handling (branch switches that affect which structural state
is relevant), and two output surfaces (tool API + CLI command).
The `graft stage-explain` command that iterates over all staged
files adds integration complexity with Git's index. However, the
DAG traversal infrastructure is provided by upstream cards — this
card builds the query logic and surfaces on top of it, not the
storage layer. L, not XL, because it consumes existing DAG
infrastructure rather than building it.
