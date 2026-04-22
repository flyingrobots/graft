---
title: Counterfactual refactoring
feature: speculative
kind: trunk
legend: WARP
lane: cool-ideas
effort: XL
requirements:
  - WARP Level 1 indexing (shipped)
  - git-warp Strands for speculative writes (backlog)
  - Structural entropy and coupling metrics (backlog)
acceptance_criteria:
  - A hypothetical structural change can be applied to a forked worldline without modifying any files
  - Multiple hypothetical refactors can be spawned and compared on structural entropy, export surface, and coupling
  - Forked worldlines use structure-sharing (copy-on-write) so cost is proportional to the delta
  - The system recommends the refactor with the best structural outcome
  - A test verifies that forking a worldline and applying a hypothetical change does not modify the working tree
blocked_by:
  - WARP_codebase-entropy-trajectory
blocking:
  - WARP_structural-impact-prediction
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
applied to code structure. Not Monte Carlo -- deterministic
structural exploration of the possibility space.

## Implementation path

1. Design the forked-worldline data structure: a copy-on-write
   overlay on the existing WARP graph that captures speculative
   structural changes without touching the working tree.
2. Implement speculative patch application: given a description
   of a structural change (extract class, merge modules, rename
   symbol), produce the forked worldline with the new structural
   state.
3. Integrate entropy scoring from `WARP_codebase-entropy-trajectory`:
   compute entropy, coupling coefficients, and export surface
   metrics on the forked worldline.
4. Build the comparison engine: spawn N forked worldlines from
   different hypothetical refactors, score each, rank by
   structural outcome.
5. Expose as a tool: agent describes candidate refactors, graft
   returns the ranked comparison with per-metric breakdowns.

## Related cards

- **WARP_codebase-entropy-trajectory** (blocked_by -- hard dep):
  Counterfactual refactoring compares alternatives by their entropy
  scores. Without entropy trajectory, there is no scoring function
  to rank the hypothetical refactors. This is the load-bearing
  dependency.
- **WARP_structural-impact-prediction** (blocking -- hard dep):
  Impact prediction needs to apply speculative patches to a forked
  worldline and observe downstream breakage. Counterfactual
  refactoring provides the forking and speculative-patch machinery.
- **WARP_speculative-merge**: Both fork the worldline for
  speculative analysis, but speculative merge focuses on branch
  merges while counterfactual refactoring focuses on hypothetical
  code changes. They share infrastructure (forked worldlines,
  copy-on-write) but neither blocks the other -- they are sibling
  consumers of the same substrate feature (git-warp Strands).
- **WARP_technical-debt-curvature**: Curvature metrics could
  consume counterfactual outputs ("which refactor reduces debt
  curvature the most?") but curvature may define its own metrics
  independently. Not a hard dep.

## Effort rationale

XL. This card requires designing a novel data structure (forked
worldlines with structure-sharing), implementing speculative patch
application for multiple refactoring patterns, and building a
comparison/ranking engine. The git-warp Strands substrate does not
exist yet, making this a long-horizon feature with significant
design and implementation work.
