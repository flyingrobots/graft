---
title: "Optimize structural-churn to use WARP aggregate queries"
legend: "CORE"
cycle: "CORE_rewrite-structural-churn-to-use-warp-aggregate-queries"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-churn-to-use-warp-aggregate-queries.md"
---

# Optimize structural-churn to use WARP aggregate queries

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-structural-churn-to-use-warp-aggregate-queries.md`
Legend: CORE

## Hill

`structuralChurnFromGraph(ctx, options?)` computes per-symbol churn
counts through WARP query aggregation instead of walking each commit and
accumulating counts in an operation-local map.

## Playback Questions

### Human

- [x] Does `graft_churn` still rank symbols by change frequency?
- [x] Are deleted symbols still represented when their last structural
      change is a removal?
- [x] Does the v0.7.0 backlog show that refactor-difficulty can now
      consume aggregate-backed churn?

### Agent

- [x] Does the WARP churn operation call `QueryBuilder.aggregate()` for
      commit counts and per-symbol touch counts?
- [x] Is there no per-commit traversal loop in
      `structuralChurnFromGraph()`?
- [x] Does the removed-symbol path use tick receipt evidence when a
      tombstoned `sym:*` node can no longer be matched as live graph
      state?

## Non-goals

- [x] Adding a grouped aggregate API to git-warp.
- [x] Rewriting `graft_log` or `graft_blame`.
- [x] Removing the legacy Git-backed `structuralChurn()` operation was out of
      scope for this optimization cycle. Follow-up cycle
      `dead-code-old-git-operations` later deleted the dead module after
      migrating remaining tests.

## Notes

git-warp 16 provides aggregate counts for a matched node set, but it
does not provide grouped aggregation. This cycle therefore computes each
symbol's count through aggregate queries over `commit:*` nodes whose
outgoing structural-change edges touch that symbol.

Live symbols are counted with `QueryBuilder.aggregate({ count: true,
max: "tick" })`. Tombstoned symbols are first discovered from WARP tick
receipts, then counted from applied structural `EdgeAdd` receipt
outcomes because the deleted `sym:*` node is no longer matchable as a
live query seed.
