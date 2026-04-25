---
title: "Use ProvenanceIndex for structural-blame last-touch provenance"
feature: structural-queries
kind: trunk
legend: CORE
release: "v0.7.0"
lane: v0.7.0
requirements:
  - "indexHead emits commit nodes with tick property (shipped)"
  - "ProvenanceIndex class available in git-warp (shipped)"
  - "Worldline.seek() API available in git-warp (shipped)"
acceptance_criteria:
  - "structural-blame traces symbol provenance through WARP ticks"
  - "Last-touch detection uses ProvenanceIndex, not full commit walking"
  - "Zero GitClient calls for commit history in the operation"
blocking:
  - CORE_git-graft-enhance
---

# Use ProvenanceIndex for structural-blame last-touch provenance

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`graft_blame` now calls `structuralBlameFromGraph(ctx, symbolName,
filePath)` from `src/warp/warp-structural-blame.ts`. It composes
`symbolTimeline` and WARP-based reference counting, and makes zero
GitClient calls on the MCP execution path.

The remaining gap is narrower than the original rewrite card:
last-touch provenance comes from `symbolTimeline`, not git-warp's
`ProvenanceIndex`. That is accurate enough for the current tool shape
but not the intended provenance primitive.

## Target state

Use `worldline().seek()` to trace a symbol's provenance through ticks.
Use `ProvenanceIndex.patchesFor()` for last-touch detection instead of
walking the full commit history.

## Available APIs

- `ProvenanceIndex` class with `patchesFor()`, `has()`
- `Worldline.seek()` for time-travel to specific ticks
- `Worldline.getNodeProps()` for reading sym state at a point in time

Effort: M
