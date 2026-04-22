---
title: "WARP: Speculative merge forks"
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
AST conflicts are — without actually merging in git.

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

See legend: WARP. Depends on Level 1 (commit-level worldline).
