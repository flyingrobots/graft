---
title: "WARP: Causal write tracking"
requirements:
  - WARP Level 1 indexing (shipped)
  - Write interception via hooks on Edit tool (backlog)
  - Sub-commit WARP nodes (backlog — persisted sub-commit local history)
  - Causal linking between observations (backlog — provenance attribution instrumentation)
acceptance_criteria:
  - Every agent write is recorded as a structural observation node in the WARP graph
  - Write observations are causally linked to the preceding read observations that informed them
  - Walking backward from a test failure reaches the read that informed the edit that caused it
  - No unobserved edits exist for writes made through agent tools
  - A test verifies that a read-then-edit sequence produces a causal chain in the WARP graph
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
