---
title: "Counterfactual refactoring"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "git-warp Strands for speculative writes (backlog)"
  - "Structural entropy and coupling metrics (backlog)"
acceptance_criteria:
  - "A hypothetical structural change can be applied to a forked worldline without modifying any files"
  - "Multiple hypothetical refactors can be spawned and compared on structural entropy, export surface, and coupling"
  - "Forked worldlines use structure-sharing (copy-on-write) so cost is proportional to the delta"
  - "The system recommends the refactor with the best structural outcome"
  - "A test verifies that forking a worldline and applying a hypothetical change does not modify the working tree"
---

# Counterfactual refactoring

Fork the worldline. Apply a hypothetical structural change. See
the outcome without modifying any files.

"What if I extract this class?" "What if I change this interface?"
"What if I merge these two modules?"

Structure-sharing (copy-on-write) means you only pay for the
delta. Spawn 5 hypothetical refactors, compare their structural
entropy, export surface, coupling scores. Recommend the best one.

This is the Counterfactual Execution Engine (CFEE) from AION
applied to code structure. Not Monte Carlo — deterministic
structural exploration of the possibility space.

Depends on: WARP Level 1 (shipped), git-warp Strands for
speculative writes.
