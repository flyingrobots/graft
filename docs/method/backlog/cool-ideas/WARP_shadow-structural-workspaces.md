---
title: "Shadow structural workspaces"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "git-warp Strands (backlog)"
  - "Multi-writer support (backlog)"
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

Depends on: WARP Level 1 (shipped), git-warp Strands, multi-writer
support (currently single-writer).

See also: JIT (~/git/jit) — Shadow Working Sets.
