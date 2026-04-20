---
title: "Deprecate indexCommits in favor of indexHead"
legend: CORE
lane: v0.7.0
---

# Deprecate indexCommits in favor of indexHead

Source: symbol-reference-tracing cycle (2026-04-20)

The existing `indexCommits` infrastructure walks git history commit-by-commit,
diffs outlines between parent and child, and emits per-commit patches with
adds/removes/changes edges. This reimplements time-travel and provenance
tracking that WARP provides natively at the substrate level.

`indexHead` replaces this with a simpler model: parse all files at HEAD,
emit the full AST + cross-file edges as one atomic patch. WARP handles
history via ticks, worldline seeks, and provenance index slicing.

## Work

1. Migrate all consumers of `indexCommits` to use `indexHead`
2. Update MCP tools that call `indexCommits` during startup
3. Verify temporal queries still work via WARP worldlines
4. Remove `indexCommits`, `prepareChange`, and related commit-walking machinery
5. Remove `indexer-git.ts` commit enumeration helpers
6. Update tests that rely on multi-commit indexing patterns

## Affected files

- `src/warp/indexer.ts` — the main commit walker
- `src/warp/indexer-git.ts` — git commit helpers
- `src/warp/indexer-graph.ts` — outline-based sym: emission (replaced by indexHead's emitSymNodes)
- `src/warp/indexer-model.ts` — PreparedChange type
- All tests that call `indexCommits`

Effort: L
