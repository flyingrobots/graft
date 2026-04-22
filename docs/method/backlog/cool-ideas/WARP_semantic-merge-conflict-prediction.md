---
title: Semantic merge conflict prediction
requirements:
  - WARP Level 1 indexing (shipped)
  - Per-branch worldlines (backlog)
  - Export surface diff (backlog)
acceptance_criteria:
  - Detects semantic incompatibilities that git would auto-merge without conflict (e.g., signature change + call using old signature)
  - "Reports specific incompatibilities: signature mismatches, missing parameters, interface violations"
  - Runs pre-merge and exits non-zero when semantic conflicts are found
  - Zero false positives on branches with only textual (non-structural) divergence
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
