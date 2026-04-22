---
title: "Rewrite structural-review to use WARP graph queries"
legend: CORE
release: "v0.7.0"
lane: v0.7.0
---

# Rewrite structural-review to use WARP graph queries

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-review` uses `countSymbolReferences` from `reference-count.ts`
which shells out to ripgrep/grep to count how many files reference a symbol.

## Target state

Replace ripgrep shelling with WARP graph traversal. `indexHead` already
emits `resolves_to` and `references` edges via `resolveImportEdges`.
Use `QueryBuilder.incoming(\"references\")` to count references natively.

## Available APIs

- `app.worldline().query().match(symId).incoming(\"references\").run()`
- `Observer.query().match(ids).select([\"id\", \"props\"]).run()`

Effort: S
