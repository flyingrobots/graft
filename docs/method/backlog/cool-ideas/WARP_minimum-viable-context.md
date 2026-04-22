---
title: "Minimum viable context"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "code_find (shipped)"
  - "Structural impact prediction (backlog)"
acceptance_criteria:
  - "Given a target symbol, the system produces the minimal set of files needed to understand and modify it"
  - "The file set is derived from structural dependency edges, not text search"
  - "Context size (in tokens) is measurably smaller than whole-repo or grep-based approaches for equivalent tasks"
  - "Agent task completion rate is not degraded when using minimum viable context vs. full repo context"
---

# Minimum viable context

Agent needs to fix function X. WARP knows the structural
dependency graph — which symbols call X, which files contain them.

Pre-populate the agent's context with ONLY the structurally
relevant files. Not grep. Not the whole repo. The actual
dependency surface.

Minimum bytes for maximum task completion probability.

Depends on: WARP Level 1 (shipped), code_find (cycle 0024),
structural impact prediction (backlog).
