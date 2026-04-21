---
title: "Rewrite structural-queries to use WARP native operations"
legend: CORE
lane: v0.7.0
blocked_by:
  - CORE_widen-warp-port
blocks:
  - CORE_deprecate-index-commits
---

# Rewrite structural-queries to use WARP native operations

Source: WARP model alignment audit (2026-04-20)

`structural-queries.ts` manually walks observer edges to reconstruct
symbol history. It should be thin wrappers over WARP's QueryBuilder
and worldline temporal queries.

## Current functions

- `symbolsForCommit(warp, sha)` — manual observer + edge parsing
- `commitsForSymbol(warp, name, path?)` — manual traversal over commit nodes
- `detectRemovals(warp, tick)` — manual graph walk

## Should become

- `symbolsForCommit` → `worldline(tickOfCommit).query().match("sym:*").run()`
- `commitsForSymbol` → provenance slice of the symbol node
- `detectRemovals` → temporal diff between ticks via WARP's StateDiffResult

## Prerequisite

- WarpHandle port must expose query() and worldline()

Effort: M
