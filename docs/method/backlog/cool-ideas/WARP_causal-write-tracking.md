---
title: "WARP: Causal write tracking"
feature: provenance
kind: leaf
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - WARP Level 1 indexing (shipped)
  - Write interception via hooks on Edit tool (backlog)
  - Sub-commit WARP nodes (backlog -- persisted sub-commit local history)
  - Causal linking between observations (backlog -- provenance attribution instrumentation)
acceptance_criteria:
  - Every agent write is recorded as a structural observation node in the WARP graph
  - Write observations are causally linked to the preceding read observations that informed them
  - Walking backward from a test failure reaches the read that informed the edit that caused it
  - No unobserved edits exist for writes made through agent tools
  - A test verifies that a read-then-edit sequence produces a causal chain in the WARP graph
blocked_by:
  - WARP_agent-action-provenance
---

# WARP: Causal write tracking

Like jj eliminates staged/unstaged by treating every working-copy
state as a commit, graft could eliminate "unobserved edits" by
treating every agent write as a structural observation in WARP.

The causal chain of reads and writes IS the reasoning trace. Walk
backward from a test failure to the read that informed the edit
that caused it.

Requires: write interception (hooks on Edit tool), sub-commit WARP
nodes, causal linking between observations.

See legend: WARP, Level 3.

## Implementation path

1. Instrument the Edit tool (and any other write-capable tools) to
   emit a WARP observation node on every write, capturing the file,
   symbol scope, and structural diff of the change.
2. Build the causal linker: when a write observation is created,
   walk backward through the session's recent read observations to
   find the reads that informed it (same file, related symbols,
   temporal proximity within the session).
3. Persist write observations as sub-commit WARP nodes: these exist
   below the commit level in the WARP graph, capturing working-copy
   structural state that has not yet been committed.
4. Implement backward traversal: given a failing test or broken
   symbol, walk backward through causal links to find the write
   that caused it, then the reads that informed that write.
5. Ensure completeness: validate that no writes through agent tools
   escape observation. Add instrumentation tests for each write-
   capable tool.

## Why blocked by agent-action-provenance

Agent-action-provenance defines the observation and mutation node
types, the causal linking model, and the multi-agent interleaving
semantics. Causal write tracking is a specialization of that
infrastructure focused specifically on write interception. Without
the provenance node schema and causal edge model from agent-action-
provenance, write tracking would have to reinvent those primitives.
Building provenance first gives write tracking a foundation to
build on.

## Related cards

- **WARP_agent-action-provenance** (blocked_by -- hard dep):
  Provides the observation/mutation node types and causal linking
  model. See above.
- **WARP_provenance-dag**: The DAG structures all observation
  data (reads and writes) into a queryable graph. Causal write
  tracking focuses specifically on the write-interception mechanism
  and its causal links to reads. They are complementary: write
  tracking produces write observations with causal edges, the DAG
  organizes all observations (including writes) into a traversable
  structure. Not a hard dep -- each can be built independently.
- **WARP_reasoning-trace-replay**: Replay walks the causal chain
  that write tracking helps build. But replay depends on the
  provenance DAG, not directly on write tracking. The edges write
  tracking creates feed into the DAG which replay consumes. Not a
  direct hard dep.
- **SURFACE_governed-write-tools**: Governed write tools could be
  the instrumentation point where write observations are emitted.
  If governed writes ship first, write tracking gets its
  interception hooks for free. But write tracking can also
  instrument the raw Edit tool directly. Not a hard dep.
- **WARP_intent-and-decision-events**: Decision events enrich the
  causal chain between reads and writes. Without them, the chain
  is reads-then-writes with no "why." Complementary but not
  blocking in either direction.

## Effort rationale

Large. Write interception requires instrumenting every write-
capable tool path, designing sub-commit WARP nodes (a new storage
tier below commits), and building the causal linker that connects
writes to preceding reads. The sub-commit node storage is the
hardest part -- it needs to be efficient (high-frequency writes
during active editing) and must integrate with the existing WARP
graph without bloating it. However, this does not require new
substrate features like Strands or per-branch worldlines, keeping
it below XL.
