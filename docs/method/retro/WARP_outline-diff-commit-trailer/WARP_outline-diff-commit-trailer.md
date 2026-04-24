# Retro: WARP_outline-diff-commit-trailer

## What shipped

Two functions in `src/warp/outline-diff-trailer.ts`:
- `formatStructuralDiffTrailer(entries, options?)` — format symbol changes as a git trailer
- `parseStructuralDiffTrailer(text)` — parse trailer back into structured entries

Format: `Structural-Diff: added fn:X; removed class:Y; changed fn:Z`

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Post-commit hook appends trailer | ❌ No hook script — just format/parse primitives |
| Trailer lists symbols with kind | ✅ |
| Agents can parse from git log | ✅ parseStructuralDiffTrailer |
| Machine-readable and documented | ✅ |

## Gaps

1. **No hook integration**: The card says "a post-commit hook appends"
   but only the format/parse layer was built. No scripts/hooks/ script.
   The prepare-commit-msg approach (mentioned in the card body) would
   avoid the no-amend policy conflict.

## Drift check

Pure functions. No node imports, no port usage needed. No architecture concerns.

## Tests (6)

Format: added/removed/changed, empty, truncation.
Parse: round-trip, empty input, malformed entries.
