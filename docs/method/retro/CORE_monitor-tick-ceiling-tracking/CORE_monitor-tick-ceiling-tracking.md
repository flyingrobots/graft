# Retro: monitor-tick-ceiling-tracking

## What shipped

A tick ceiling guard in `runMonitorTickJob` that skips `openWarp` and
`indexHead` when HEAD hasn't changed since the last indexed commit.
Idle monitor ticks are now near-zero-cost.

## Implementation

Single `if` guard at the top of `runMonitorTickJob`:
- Compare `headAtStart` against `job.lastIndexedCommit`
- If equal (including both null for empty repos), return early with
  a no-op success result
- If different, proceed with full indexing as before

## Tests (5)

1. Skip when HEAD matches lastIndexedCommit
2. Index when HEAD differs
3. Index on first run (lastIndexedCommit null)
4. Consecutive ticks with same HEAD — second skips
5. Empty repo with both null — skips

## What went well

- The `lastIndexedCommit` field already existed on the job interface.
  The implementation was purely additive — one guard clause.
- The WARP ref check (`for-each-ref refs/graft-ast`) cleanly proves
  that `openWarp` was never called, not just that the result says 0.

## What to watch

- The ceiling is in-memory only (per-session). First tick after MCP
  restart always re-indexes. The card noted optional persistence as
  a future enhancement — not needed for the core value.
