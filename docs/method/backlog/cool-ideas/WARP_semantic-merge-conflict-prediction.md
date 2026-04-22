---
title: Semantic merge conflict prediction
legend: WARP
lane: cool-ideas
effort: L
blocked_by:
  - CLEAN_CODE_export-diff-semver-signature-as-patch
requirements:
  - WARP Level 1 indexing (shipped)
  - Per-branch worldlines (backlog — git-warp substrate)
  - Export surface diff with accurate semver classification (v0.7.0 fix in backlog)
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

## Implementation path

1. Index both branches' structural state (requires per-branch
   worldlines — git-warp substrate feature, not yet available)
2. Compute export surface diff between the branches using
   `export-surface-diff` (needs accurate semver classification
   from the v0.7.0 fix)
3. For each changed exported symbol, find call sites on the
   other branch via `references` edges
4. Check compatibility: does the call site match the new
   signature? Missing params, type mismatches, removed symbols?
5. Report incompatibilities with file, line, symbol, and nature
   of the conflict

## Why blocked by export-diff semver fix

The current `export-surface-diff` classifies ALL signature changes
as "patch" (`CLEAN_CODE_export-diff-semver-signature-as-patch`).
Merge conflict prediction needs to distinguish breaking changes
(removed params, narrowed types) from non-breaking ones (added
optional params). Without accurate classification, the predictor
would either miss real conflicts or flood with false positives.

## External dependency: per-branch worldlines

Per-branch worldlines are a git-warp substrate feature — WARP
currently only indexes HEAD on the current branch. Indexing two
branches' structural state simultaneously requires substrate
support not yet available. Shared dependency with
`WARP_rulial-heat-map` (also needs per-branch worldlines).

This makes semantic merge conflict prediction a longer-horizon
card — it can't be built until the git-warp substrate grows
multi-branch indexing.

## Related cards

- **WARP_rulial-heat-map**: Also needs per-branch worldlines.
  Rulial heat map shows per-symbol divergence intensity; merge
  conflict prediction detects specific incompatibilities. Same
  infrastructure, different output.
- **WARP_auto-breaking-change-detection**: Breaking-change
  detection compares tags on the same branch; merge conflict
  prediction compares branches. Similar analysis, different axis.
- **WARP_speculative-merge**: Speculative merge forks the
  worldline to test a merge. Merge conflict prediction detects
  problems without forking. Complementary approaches.

## Effort rationale

Large. Per-branch worldlines are a substrate change. Cross-branch
semantic comparison is algorithmically complex (need to handle
transitive dependencies, not just direct call sites). The
accuracy bar is high (zero false positives required).
