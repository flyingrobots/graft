---
title: "Optimize structural-churn to use WARP aggregate queries"
cycle: "CORE_rewrite-structural-churn-to-use-warp-aggregate-queries"
design_doc: "docs/design/CORE_rewrite-structural-churn-to-use-warp-aggregate-queries.md"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-churn-to-use-warp-aggregate-queries.md"
outcome: hill-met
drift_check: yes
---

# Optimize structural-churn to use WARP aggregate queries Retro

## Summary

The hill was met. `structuralChurnFromGraph()` no longer walks each
commit and no longer accumulates per-symbol counts in an operation-local
`Map`.

The live-symbol path computes touch counts with WARP
`QueryBuilder.aggregate()` over `commit:*` nodes. Deleted symbols remain
visible through tick receipt evidence, which is necessary because a
tombstoned `sym:*` node is not matchable as live query state.

This closes the v0.7.0 backlog card by retro/witness, not by a
graveyard tombstone.

## What Shipped

- Replaced per-commit `traverse.bfs()` churn counting with
  aggregate-backed per-symbol touch counts.
- Added aggregate query coverage for total indexed commits and
  per-symbol last-touch tick.
- Preserved deleted-symbol churn by discovering tombstoned symbols from
  tick receipts and counting applied structural edge outcomes.
- Added tests proving aggregate usage, deleted-symbol churn, limit
  handling, empty graphs, and zero GitClient dependency.
- Updated v0.7.0 release truth surfaces and unblocked the refactor
  difficulty backlog card.

## Validation

- `pnpm exec vitest run test/unit/warp/warp-structural-churn.test.ts`
- `git diff --check`
- `pnpm guard:agent-worktrees`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

## Follow-On Pressure

git-warp aggregate queries count a matched node set but do not group
results. This cycle uses one aggregate query set per symbol. That is
strictly better than per-commit operation loops for this release card,
but a future grouped aggregate API would let `graft_churn` compute the
entire ranked table in fewer graph queries.
