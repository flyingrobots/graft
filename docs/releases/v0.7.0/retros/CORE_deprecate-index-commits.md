---
title: "Retro: Remove legacy commit-walking indexer"
cycle: "CORE_deprecate-index-commits"
release: "v0.7.0"
---

# Retro: CORE_deprecate-index-commits

## What went well

- Net -1,462 lines. Deleted 7 source files, 2 test files, migrated 8 tests.
- `indexHead` enhancement (commit nodes + reconciliation) was a clean bridge
  that let structural queries work without rewriting them.
- All 1175 tests pass. No structural query behavior changed.
- The outline-based sym emission (`emitOutlineSyms`) is richer than the old
  `emitSymNodes` — signatures + line ranges in one pass.

## What was harder than expected

- **Graph topology gap**: `indexHead` didn't emit `commit:*` nodes or labeled
  edges. The structural queries fundamentally depend on them. Required
  enhancing `indexHead` with prior-state reconciliation (materialize + diff)
  to produce adds/changes/removes edges.
- **Monitor type cascade**: `MonitorTickWorkerResult` fields ripple through
  5+ files (persisted schemas, health checks, repo overview). Pragmatic
  choice: kept field names, changed semantics. Filed for later cleanup.
- **sed damage**: Using sed on a 1400-line strict-schema file caused
  collateral edits (spurious `cwd` field added to unrelated schema,
  duplicate lines). Lesson: use targeted python scripts or language-aware
  tools for large file edits.

## Follow-on debt

1. **Monitor field rename** — `commitsIndexed`/`patchesWritten` in
   `MonitorTickWorkerResult` now hold `filesIndexed`/`nodesEmitted` values.
   Names lie. Needs rename + schema migration.
2. **reference-count.ts** — ripgrep shelling. Filed as bad-code card.
3. **identityId removal** — `precision-warp.ts` still reads `identityId`
   from sym props (returns undefined now, harmless). Could clean up.
4. **Full-scan in reconciliation** — `indexHead` reads all `sym:*` nodes
   before patching. Bounded by file count, acceptable for bulk ops, but
   noted for anti-sludge awareness.

## Patterns established

- **Outline-based sym emission**: `extractOutlineForFile` + jump table →
  sym nodes with name, kind, signature, exported, startLine, endLine.
  Replaces the old tree-sitter walker (`emitSymNodes`) and the separate
  `annotateSymbol`/`emitSymbols` pipeline from indexer-graph.
- **Prior-state reconciliation**: materialize → observer.getNodes() →
  diff current vs prior → labeled edges. This is the pattern for any
  future "full re-index" operation.
