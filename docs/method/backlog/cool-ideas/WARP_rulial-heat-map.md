---
title: "Rulial heat map"
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Per-branch worldlines (backlog — git-warp substrate)"
  - "Structural diff infrastructure (shipped)"
acceptance_criteria:
  - "Given two branches, produces a per-symbol divergence score (agreement, local alteration, cascading divergence, catastrophic bifurcation)"
  - "Divergence scores are derived from structural comparison, not text diff"
  - "Output can be rendered as a visual heatmap (cool blue to white-hot)"
  - "PR review can answer 'where is this PR structurally dangerous?' from the heatmap alone"
---

# Rulial heat map

Overlay two branches' structural worldlines and produce divergence
intensity per symbol. Not text diff — semantic divergence scores.

Cool blue = structural agreement. Orange = local alteration.
Red = cascading structural divergence. White-hot = catastrophic
structural bifurcation.

Debugging and code review become reading geometry, not reading
logs. "Where is this PR structurally dangerous?" has a visual
answer.

## Implementation path

1. **Per-branch worldlines** (prerequisite — not yet available):
   WARP currently indexes HEAD on the current branch only. Indexing
   two branches' structural state simultaneously requires git-warp
   substrate support for per-branch worldlines.
2. Once per-branch worldlines are available, index both branches
   to obtain parallel structural snapshots.
3. For each symbol present on either branch, compute a divergence
   score by comparing: signature, line range, export status,
   parameter list, and reference edges.
4. Classify divergence into tiers:
   - **Agreement** (cool blue): identical structure on both branches
   - **Local alteration** (orange): signature or body changed but
     no downstream impact
   - **Cascading divergence** (red): changed symbol has callers that
     also changed, suggesting a ripple effect
   - **Catastrophic bifurcation** (white-hot): symbol removed on one
     branch, heavily referenced on the other
5. Aggregate per-symbol scores into a per-file and per-directory
   heatmap for higher-level views.
6. Expose via MCP tool (`rulial_heatmap`) returning structured
   divergence data, and optionally render as a visual artifact.

## External dependency: per-branch worldlines

Per-branch worldlines are a git-warp substrate feature. WARP
currently only indexes HEAD on the current branch. This card cannot
be built until the git-warp substrate grows multi-branch indexing.
Shared dependency with `WARP_semantic-merge-conflict-prediction`
(also needs per-branch worldlines).

## Related cards

- **WARP_semantic-merge-conflict-prediction**: Also needs per-branch
  worldlines. Merge conflict prediction detects specific
  incompatibilities (signature mismatch at call site); the rulial
  heat map shows divergence intensity per symbol. Same substrate
  requirement, different output granularity. Independent builds —
  neither requires the other.
- **WARP_structural-drift-detection**: Drift detection compares
  docs against code on a single branch. Rulial heat map compares
  code against code across branches. Different comparison axes.
  Not a dependency.
- **WARP_symbol-heatmap**: Despite the word "heatmap" in both
  names, completely different. Symbol heatmap tracks observation
  frequency across sessions. Rulial heat map compares structural
  divergence between branches. No overlap.
- **CORE_pr-review-structural-summary**: PR review could consume
  the heatmap to highlight structurally dangerous areas. Nice
  enhancement but PR review works without it. Not a hard dependency.

## No dependency edges (within backlog)

The only hard prerequisite is per-branch worldlines, which is an
external git-warp substrate feature, not a backlog card. No backlog
card must ship first, and no backlog card is blocked waiting for
the rulial heat map.

## Effort rationale

Large. The divergence scoring algorithm is non-trivial — classifying
"cascading divergence" requires walking reference edges across both
branches to detect ripple effects. The external dependency on
per-branch worldlines means the implementation can't start until
substrate support lands. Once worldlines are available, the
structural comparison is M-level work, but designing the
classification tiers, handling edge cases (renamed symbols, moved
files), and producing useful visual output pushes to L.
