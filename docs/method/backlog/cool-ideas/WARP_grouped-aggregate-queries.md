---
title: "Grouped aggregate queries for WARP structural metrics"
feature: structural-queries
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "QueryBuilder.aggregate() (shipped)"
acceptance_criteria:
  - "A grouped aggregate API can count graph matches by a selected node property or ID"
  - "Structural churn can compute the full ranked symbol table without one aggregate query set per symbol"
  - "Tests cover grouping by node ID and by exposed property"
---

# Grouped aggregate queries for WARP structural metrics

`QueryBuilder.aggregate()` can count, sum, min, max, and average a
matched node set, but it does not group results.

That is enough for aggregate-backed `graft_churn`, but the current
implementation still runs one aggregate query set per symbol because the
ranked churn table is grouped by `sym:*` identity.

## Why This Matters

Structural metrics such as churn, entropy, difficulty scores, and
codebase signatures naturally ask for grouped counts:

- changes per symbol
- references per file
- churn per directory
- additions/removals per tick

A grouped aggregate API would let these metrics stay substrate-side
without operation-layer loops over each group key.

## Possible Shape

```ts
query()
  .match("commit:*")
  .outgoing("changes")
  .aggregate({ count: true, groupBy: "id" })
```

The exact API belongs in git-warp, but Graft should track the need
because structural metrics are the first visible consumers.
