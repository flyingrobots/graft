---
title: "Rewrite structural-blame to use WARP worldline provenance"
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

# Rewrite structural-blame to use WARP worldline provenance

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-blame` is a pure function that takes pre-fetched symbol
history and commit metadata. The MCP tool handler fetches this data
via `commitsForSymbol()` + `getCommitMeta()` per commit.

## Target state

Use `worldline().seek()` to trace a symbol's provenance through ticks.
Use `ProvenanceIndex.patchesFor()` for last-touch detection instead of
walking the full commit history.

## Available APIs

- `ProvenanceIndex` class with `patchesFor()`, `has()`
- `Worldline.seek()` for time-travel to specific ticks
- `Worldline.getNodeProps()` for reading sym state at a point in time

Effort: M
