---
title: "WARP: Speculative merge forks"
feature: speculative
kind: trunk
legend: WARP
lane: cool-ideas
effort: XL
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "git-warp Strands (backlog)"
  - "Structural diff infrastructure (shipped)"
acceptance_criteria:
  - "A worldline can be forked and both branches' structural patches applied without modifying git state"
  - "Structural conflicts are detected: duplicate method names, signature mismatches across branches, moved-then-modified symbols"
  - "Speculative merge results are queryable (which symbols conflict, which are clean)"
  - "Can simulate rebase-style replay by forking and applying patches in alternate order"
---

# WARP: Speculative merge forks

Use Strands and Braids to model speculative branch merges. Fork the
worldline, apply both branches' structural patches, see where the
AST conflicts are -- without actually merging in git.

Structural conflicts are richer than text conflicts:
- Both branches added a method with the same name to the same class
- One branch changed a function signature that the other branch calls
- One branch moved a symbol that the other branch modified in place
- Export surface changed incompatibly across branches

This is merge preview at the structural level. Git sees line
collisions. WARP sees semantic collisions.

Could also simulate: "what would happen if I rebased this branch
onto current main?" by forking the worldline and replaying patches
in a different order.

## Implementation path

1. Extend the WARP graph to support per-branch worldlines: index
   structural state on two branches simultaneously (requires
   git-warp Strands substrate).
2. Build the fork-and-apply engine: take two branches' structural
   diffs relative to their merge base, apply both to a forked
   worldline.
3. Implement structural conflict detection: walk the merged
   worldline looking for incompatibilities -- duplicate symbol
   names in the same scope, signature mismatches at call sites,
   symbols that were both moved and modified.
4. Build query interface: expose results as a structured report
   (which symbols conflict, which are clean, nature of each
   conflict).
5. Add rebase simulation: replay one branch's patches on top of
   the other's in sequence, detecting ordering-dependent conflicts.

## Related cards

- **WARP_semantic-merge-conflict-prediction**: Closely related but
  different approach. Semantic merge conflict prediction detects
  problems by comparing branches' export surfaces without forking.
  Speculative merge actually forks the worldline and applies
  patches. They are complementary -- semantic merge conflict
  prediction is a fast check, speculative merge is a deep
  simulation. Not a hard dep in either direction; both need
  per-branch worldlines from the same substrate feature.
- **WARP_counterfactual-refactoring**: Both fork the worldline
  for speculative analysis. Counterfactual refactoring focuses on
  hypothetical code changes; speculative merge focuses on branch
  merges. They share the forked-worldline infrastructure (git-warp
  Strands) but neither blocks the other.
- **WARP_structural-impact-prediction**: Impact prediction could
  use speculative merge to answer "what breaks if I merge this
  branch?" but it can also work from counterfactual refactoring
  alone. Not a hard dep.

## No hard dependency edges

Both speculative merge and its related cards (counterfactual
refactoring, semantic merge conflict prediction) depend on the
same substrate feature (git-warp Strands / per-branch worldlines)
but none of them block each other. They are sibling features that
share infrastructure.

## Effort rationale

XL. Per-branch worldlines are a substrate change to git-warp that
does not exist yet. Structural conflict detection across branches
is algorithmically complex -- need to handle transitive
dependencies, ordering-dependent conflicts, and moved-then-modified
symbols. The rebase simulation adds another dimension of
complexity. Long-horizon feature.
