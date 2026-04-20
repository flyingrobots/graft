---
title: "structural-queries cannot distinguish 'no changes' from 'not indexed'"
legend: CLEAN_CODE
lane: graveyard
superseded: true
superseded_reason: "Superseded: structural-queries will be rewritten to use WARP native temporal queries"
blocks:
  - CLEAN_CODE_structural-blame-ambiguity
---

# structural-queries cannot distinguish "no changes" from "not indexed"

Source: design review exercise 2026-04-19

`symbolsForCommit` in `src/warp/structural-queries.ts` returns empty arrays when a commit has no WARP edges. Callers cannot distinguish between "this commit had no structural changes" and "this commit was never indexed by WARP."

This matters for graft_log: an entry with "no symbol changes" may mean the commit genuinely only changed whitespace, OR it may mean the WARP indexer hasn't processed it yet.

Fix: return an `indexed: boolean` flag in `CommitSymbols` indicating whether the commit node exists in the WARP graph at all.

Affected files:
- `src/warp/structural-queries.ts` lines 118-158

Effort: S
