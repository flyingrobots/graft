---
title: Optimize structural-churn to use WARP aggregate queries
feature: structural-queries
kind: trunk
legend: CORE
release: v0.7.0
lane: v0.7.0
requirements:
  - indexHead emits commit nodes with tick property (shipped)
  - QueryBuilder.aggregate() API available in git-warp (shipped)
acceptance_criteria:
  - structural-churn uses WARP aggregate queries instead of per-commit iteration
  - Zero GitClient calls for commit enumeration in the operation
  - Change counts computed natively in WARP, not in-memory Maps
blocking:
  - WARP_codebase-entropy-trajectory
  - WARP_refactor-difficulty-score
---

# Optimize structural-churn to use WARP aggregate queries

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`graft_churn` now calls `structuralChurnFromGraph(ctx, options?)` from
`src/warp/warp-structural-churn.ts`. It reads commit and symbol facts
from WARP and makes zero GitClient calls on the MCP execution path.

The remaining gap is narrower than the original rewrite card:
`structuralChurnFromGraph` still traverses each commit and accumulates
counts in an in-memory `Map`. That is functionally correct, but it is
not yet the aggregate-query shape this card intended.

## Target state

Use `QueryBuilder.aggregate()` to compute change counts natively in WARP
instead of per-commit iteration with in-memory accumulation.

## Available APIs

- `QueryBuilder.aggregate({ count: true, sum: true })`
- `Worldline.materialize({ receipts: true })` for tick-based change detection

Effort: M
