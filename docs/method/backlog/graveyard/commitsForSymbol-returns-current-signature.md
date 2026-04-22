---
title: "commitsForSymbol returns current signature for all commits, not historical"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
---

# commitsForSymbol returns current signature for all commits

`commitsForSymbol` in `src/warp/structural-queries.ts` traverses
incoming `adds`/`changes`/`removes` edges to find commits that
touched a symbol. However, it reads the signature from the CURRENT
sym node (at HEAD), not the signature AT EACH COMMIT.

This means every `SymbolCommit` entry in the result has the same
signature — the one at HEAD — regardless of what the signature was
when that commit was made.

`symbolTimeline` in `src/warp/symbol-timeline.ts` correctly captures
per-tick signatures via ceiling observers. Consider either:
1. Deprecating `commitsForSymbol` in favor of `symbolTimeline`
2. Fixing `commitsForSymbol` to use ceiling observers for historical signatures

Affected files:
- `src/warp/structural-queries.ts` lines 212-269
