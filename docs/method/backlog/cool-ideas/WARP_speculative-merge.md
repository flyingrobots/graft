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
