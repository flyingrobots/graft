---
title: "Widen WarpHandle port to expose query/traverse/worldline"
legend: CORE
lane: v0.7.0
blocks:
  - CORE_deprecate-index-commits
  - CORE_rewrite-structural-queries
---

# Widen WarpHandle port to expose query/traverse/worldline

Source: WARP model alignment audit (2026-04-20)

The WarpHandle port only exposes 5 methods: patch(), observer(), hasNode(),
materialize(), materializeReceipts(). This hides git-warp's actual query
and time-travel capabilities, forcing application code to reimplement
traversal and history logic manually.

## What to expose

- `query()` → QueryBuilder (match, where, outgoing, incoming, aggregate)
- `traverse` → LogicalTraversal (BFS, DFS, shortest path, topological sort)
- `worldline(options?)` → Worldline (temporal reads, seek)

## Design options

1. Widen WarpHandle itself
2. Replace WarpHandle with WarpObserverPort + WarpWorldlinePort (matches WARP's actual primitives)

Option 2 is cleaner — it models what git-warp actually provides rather
than inventing our own flattened abstraction.

Effort: M
