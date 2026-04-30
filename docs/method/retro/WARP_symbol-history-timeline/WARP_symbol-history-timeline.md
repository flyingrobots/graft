# Retro: WARP_symbol-history-timeline

## What shipped

`symbolTimeline(ctx, symbolName, filePath?)` — ordered version
history for a single symbol across all commits. Returns
`SymbolTimelineResult { symbol, filePath?, versions[] }`.

Each `SymbolVersion` includes: sha, tick, changeKind, present,
signature, startLine, endLine, filePath.

## Implementation

Snapshot-diff approach (same pattern as dead-symbol-detection):
walk commits in tick order, materialize sym state at each ceiling,
compare adjacent snapshots to detect additions, changes, and
removals. This avoids relying on `removes` edges which are
invisible post-tombstone.

## Tests (5)

1. Single entry for newly added symbol
2. Signature changes tracked in tick order
3. Removal detected with present=false
4. filePath filter isolates one file
5. Empty result for nonexistent symbol

## Adaptation from wrecking crew branch

- `WarpHandle` → `WarpContext` + `observeGraph()` convention
- `WarpObserverLens` → `Lens` (git-warp native type)
- `observe()` helper → `observeGraph()` from context.ts

## Relationship to commitsForSymbol

`commitsForSymbol` in structural-queries.ts has a flaw: it returns
the CURRENT sym node signature for all entries, not the historical
signature at each commit. `symbolTimeline` correctly captures
per-tick state via ceiling observers. If we consolidate later,
commitsForSymbol should be replaced by symbolTimeline.
