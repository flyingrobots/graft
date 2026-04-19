---
title: "Semantic merge conflict prediction"
---

# Semantic merge conflict prediction

Before you merge, WARP detects: "Branch A changed evaluatePolicy's
signature. Branch B added a call using the OLD signature. Git will
auto-merge (no text conflict) but the code breaks at runtime."

Git sees line collisions. WARP sees semantic incompatibility —
signature mismatches, missing parameters, interface violations
across branches that git happily merges.

Depends on: WARP Level 1 (shipped), per-branch worldlines
(backlog), export surface diff (backlog).
