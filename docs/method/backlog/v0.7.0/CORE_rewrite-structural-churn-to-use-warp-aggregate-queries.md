---
title: "Rewrite structural-churn to use WARP aggregate queries"
legend: CORE
release: "v0.7.0"
lane: v0.7.0
requirements:
  - "indexHead emits commit nodes with tick property (shipped)"
  - "QueryBuilder.aggregate() API available in git-warp (shipped)"
acceptance_criteria:
  - "structural-churn uses WARP aggregate queries instead of per-commit iteration"
  - "Zero GitClient calls for commit enumeration in the operation"
  - "Change counts computed natively in WARP, not in-memory Maps"
---

# Rewrite structural-churn to use WARP aggregate queries

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-churn` iterates git commits, calls `symbolsForCommit()` per
commit, accumulates change counts in a Map, then ranks by frequency.

## Target state

Use `QueryBuilder.aggregate()` to compute change counts natively in WARP
instead of per-commit iteration with in-memory accumulation.

## Available APIs

- `QueryBuilder.aggregate({ count: true, sum: true })`
- `Worldline.materialize({ receipts: true })` for tick-based change detection

Effort: M
