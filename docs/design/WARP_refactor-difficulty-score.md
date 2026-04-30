---
title: "Refactor difficulty score"
legend: "WARP"
cycle: "WARP_refactor-difficulty-score"
source_backlog: "docs/method/backlog/v0.7.0/WARP_refactor-difficulty-score.md"
---

# Refactor difficulty score

Source backlog item: `docs/method/backlog/v0.7.0/WARP_refactor-difficulty-score.md`
Legend: WARP

## Hill

Agents can ask for a per-symbol refactor difficulty score derived from
WARP facts. The score combines structural churn curvature with
cross-file reference friction so the answer can guide "refactor vs
work around" decisions.

## Playback Questions

### Human

- [x] Can I run `graft symbol difficulty <symbol> --json`?
- [x] Does the result show the scalar score and the underlying
      curvature/friction factors?
- [x] Does a symbol with no referencing files stay low risk even when
      it has churn?

### Agent

- [x] Does `graft_difficulty` expose the same result through MCP?
- [x] Does curvature use WARP aggregate-backed symbol touch counts?
- [x] Does friction use WARP reference edges?
- [x] Are duplicate symbol names reported as separate file-scoped
      entries when no path is supplied?

## Non-goals

- [x] Building the full technical-debt curvature time series.
- [x] Replacing the policy engine with Lagrangian scoring.
- [x] Adding grouped aggregate support to git-warp.

## Scoring Model

Each entry reports:

- `curvature.changeCount`: aggregate count of WARP commit edges that
  add, change, or remove the symbol.
- `curvature.signatureChangeCount`: count of observed signature changes
  across the WARP symbol timeline.
- `friction.referenceCount`: number of unique files with WARP reference
  edges to the symbol.
- `score`: `(changeCount + signatureChangeCount) * referenceCount`.

The scalar is intentionally simple and explainable. Agents should read
the factors alongside the scalar: a high-churn symbol with no consumers
is still low-friction, while a high-churn symbol with consumers is a
candidate for planning before refactor.
