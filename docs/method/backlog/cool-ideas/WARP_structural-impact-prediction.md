---
title: "Structural impact prediction"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Counterfactual refactoring (backlog)"
  - "git-warp Strands (backlog)"
acceptance_criteria:
  - "Given a proposed signature change, predicts all downstream symbols that would break"
  - "Blast radius is computed from structural dependency edges, not text grep"
  - "Speculative patches can be applied to a forked worldline to see incompatibilities without modifying code"
  - "Prediction includes the specific nature of each break (missing parameter, type mismatch, removed dependency)"
---

# Structural impact prediction

"If I change this function's signature, what else breaks?"

WARP knows every symbol that references the target via structural
edges. Predict blast radius BEFORE writing code. Apply a
speculative patch to a forked worldline, see which downstream
symbols become incompatible.

Not grep — structural dependency analysis with temporal awareness.

Depends on: WARP Level 1 (shipped), counterfactual refactoring
(backlog), git-warp Strands.
