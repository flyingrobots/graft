---
title: "Structural impact prediction"
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
