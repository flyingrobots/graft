---
title: Rewrite structural operations to use WARP queries
legend: CORE
lane: v0.7.0
---

# Rewrite structural operations to use WARP queries

Source: WARP model alignment audit (2026-04-20)

The operations layer (structural-log, structural-churn, structural-blame)
uses per-commit callbacks and manual accumulation. These should become
WARP query calls.

## structural-log

- **Now**: walks git log SHAs, calls `querySymbols(sha)` per commit
- **Should**: `worldline().backward().query().match("sym:*").where({filePath}).run()`

## structural-churn

- **Now**: iterates commits, accumulates symbol change counts
- **Should**: `query().match("sym:*").aggregate({changeCount}).run()`

## structural-blame

- **Now**: pre-computed per-symbol/per-commit metadata
- **Should**: `worldline().provenance(symbolId)` for last touch

## structural-review

- **Now**: uses ripgrep `countSymbolReferences` for impact counting
- **Should**: `query(sym).incoming("references").count()`

Each rewrite is a separate cycle. This card tracks the overall effort.

Effort: L
