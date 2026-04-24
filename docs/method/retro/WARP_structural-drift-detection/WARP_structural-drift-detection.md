# Retro: WARP_structural-drift-detection

## What shipped

Two detection primitives in `src/warp/structural-drift-detection.ts`:
- `checkNumericClaim(options)` — parse numeric assertions in docs, compare against actual counts
- `checkPatternProhibition(options)` — verify "no X in Y" rules by scanning file contents

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Compares structural facts against WARP graph | ⚠️ Primitives take pre-computed inputs; caller queries WARP |
| Detects invariant violations | ✅ checkPatternProhibition |
| Detects method-level drift | ❌ Not implemented |
| Structured report with expected vs actual | ✅ DriftResult has docPath, expected, actual |

## Gaps

1. **Method-level drift not implemented**: The card mentions BEARING/METHOD
   direction checking but this was not built.
2. **No WARP graph integration**: Functions are pure — they take pre-computed
   data. The caller must query the WARP graph and pass results. This is
   arguably correct design (separation of concerns) but the acceptance
   criteria implies end-to-end detection.

## Drift check

Pure functions with no imports. No architecture concerns.

## Tests (6)

Numeric: wrong claim, matching claim, unparseable claim.
Pattern: violation found, no violation, multiple violations.
