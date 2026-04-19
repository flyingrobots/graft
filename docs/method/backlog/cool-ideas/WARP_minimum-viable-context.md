---
title: "Minimum viable context"
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
