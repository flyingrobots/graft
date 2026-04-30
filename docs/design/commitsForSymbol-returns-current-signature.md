---
title: "commitsForSymbol returns current signature for all commits, not historical"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# commitsForSymbol returns current signature for all commits

## Relevance

Relevant. The deprecated helper was still callable and returned misleading
history.

## Original Card

`commitsForSymbol` in `src/warp/structural-queries.ts` traverses incoming
`adds`/`changes`/`removes` edges to find commits that touched a symbol.
However, it reads the signature from the CURRENT sym node (at HEAD), not the
signature AT EACH COMMIT.

This means every `SymbolCommit` entry in the result has the same signature -
the one at HEAD - regardless of what the signature was when that commit was
made.

`symbolTimeline` in `src/warp/symbol-timeline.ts` correctly captures per-tick
signatures via ceiling observers. Consider either:

1. Deprecating `commitsForSymbol` in favor of `symbolTimeline`
2. Fixing `commitsForSymbol` to use ceiling observers for historical signatures

Affected files:

- `src/warp/structural-queries.ts` lines 212-269

## Design

Keep the deprecated API but make it delegate to `symbolTimeline`, preserving the
surface while aligning its behavior with the provenance-backed source of truth.

## Tests

`test/unit/warp/structural-queries.test.ts` asserts that the add and change
entries for `start` carry different historical signatures.
