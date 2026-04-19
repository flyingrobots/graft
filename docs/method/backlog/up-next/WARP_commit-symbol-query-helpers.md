---
title: "WARP commit-symbol query helpers"
legend: WARP
lane: up-next
---

# WARP commit-symbol query helpers

Shared query infrastructure for structural history features.

## Queries needed

1. **commits-for-symbol**: given a symbol name (+ optional file path), return all commits that added/removed/changed it, with the change kind and before/after signatures
2. **symbols-for-commit**: given a commit SHA, return all symbols added/removed/changed, grouped by file

Both are reverse traversals over existing WARP edges (`adds`, `removes`, `changes`) using the observer lens system (`commitsLens`, `symbolByNameLens`, `fileSymbolsLens`).

## Location

`src/warp/structural-queries.ts` — pure query functions that accept a `WarpHandle` and return typed results.

## Depends on

WARP Level 1 indexer (shipped v0.4.0).
