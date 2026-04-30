---
title: "Shadow structural workspaces"
feature: speculative
kind: leaf
legend: WARP
lane: cool-ideas
effort: XL
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "git-warp Strands (backlog)"
  - "Multi-writer support (backlog)"
  - "Structural diff infrastructure (shipped)"
acceptance_criteria:
  - "Each agent gets an isolated structural view (Shadow Working Set) over the WARP graph"
  - "Speculative structural changes in one agent's SWS are invisible to other agents"
  - "Two agents working on non-overlapping structural regions can proceed without coordination"
  - "Strands collapse deterministically into a single coherent worldline when both agents finish"
  - "Conflicts at collapse time are reported with structural context (not just line numbers)"
---

# Shadow structural workspaces

Each agent gets an isolated structural view — a Shadow Working
Set (SWS) over the WARP graph. Agents make speculative structural
changes without affecting each other. Collapse deterministically
when ready.

Multi-agent collaboration without coordination overhead. No locks,
no turn-taking. Each agent's structural observations and writes
live in their own strand. The CRDT merges them at collapse time.

"Agent A is refactoring auth. Agent B is adding a feature to
billing. Their structural workspaces are isolated. When both
finish, their strands collapse into a single coherent worldline."

See also: JIT (~/git/jit) — Shadow Working Sets.

## Implementation path

1. Design the Shadow Working Set (SWS) abstraction: an isolated
   fork of the WARP graph that captures one agent's structural
   observations and mutations without affecting the shared worldline.
2. Implement SWS creation: when a new agent session starts in a
   multi-agent context, fork the current WARP worldline into a new
   strand. The strand sees the same base state but accumulates
   changes independently.
3. Build the isolation layer: all WARP queries from an agent's
   session read from its SWS (base state + local changes). Writes
   are captured in the strand, not applied to the shared worldline.
4. Implement deterministic collapse: when an agent finishes, merge
   its strand back into the shared worldline. Use structural diff
   to identify what changed and apply the changes.
5. Build structural conflict detection at collapse time: when two
   strands modify the same symbols, report conflicts with structural
   context (symbol name, file, nature of the incompatibility — e.g.,
   "both agents modified the same function signature differently").
6. Handle the CRDT merge semantics: for non-conflicting changes
   (different files, different symbols), merge automatically. For
   conflicts, produce a structured report and require resolution.

## Related cards

- **WARP_footprint-parallelism**: Footprint analysis determines
  whether two operations can safely run in parallel. Shadow
  workspaces provide full isolation regardless. Footprint parallelism
  is a lighter-weight alternative when the overhead of full workspace
  isolation is unnecessary. They compose: footprint analysis could
  determine that two SWS collapse without conflicts. Not a hard
  dependency — workspaces use full isolation and don't need footprint
  analysis, footprint parallelism works without workspaces.
- **WARP_speculative-merge**: Speculative merge forks the worldline
  to test a git branch merge. Shadow workspaces fork the worldline
  for agent isolation. Both depend on the git-warp Strands substrate
  and share the fork/collapse mechanism. They are sibling features
  that share infrastructure but neither blocks the other.
- **CORE_multi-agent-conflict-detection**: Conflict detection
  notifies agents in real time when their contexts overlap. Shadow
  workspaces prevent conflicts by isolating agents. Different
  approaches to the same problem — detection is pragmatic and
  lightweight, workspaces are comprehensive and heavy. Not a hard
  dependency.
- **CLEAN_CODE_parallel-agent-merge-shared-file-loss**: The merge
  loss problem occurs at the git level when parallel agents'
  branches are combined. Shadow workspaces operate at the structural
  (WARP graph) level. Solving the git-level merge problem does not
  require workspaces, and workspaces do not solve the git-level
  problem. Independent layers.
- **WARP_semantic-merge-conflict-prediction**: Semantic merge
  prediction detects problems between git branches. Shadow workspace
  collapse detection operates on WARP strands. Similar analysis at
  different abstraction levels. Not a hard dependency.

## No dependency edges

The two unshipped requirements (git-warp Strands, multi-writer
support) are substrate features that do not exist as separate
backlog cards. They are foundational capabilities of the git-warp
system that would need to be built as part of (or prior to) this
feature. No existing backlog card provides Strands or multi-writer
as a prerequisite. Other cards that share the Strands dependency
(WARP_speculative-merge, WARP_semantic-merge-conflict-prediction)
are sibling features, not prerequisites.

## Effort rationale

XL. This requires two unshipped substrate features (git-warp
Strands for worldline forking, multi-writer support for concurrent
WARP graph access). The isolation layer must guarantee correctness
(no cross-strand leakage). Deterministic collapse with structural
conflict detection is algorithmically complex. The CRDT merge
semantics for structural changes (not just text) is an open design
problem. This is one of the highest-ambition cards in the backlog —
it reimagines multi-agent coordination at the structural level.
