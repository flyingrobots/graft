# Retro: WARP_semantic-drift-in-sessions

## What shipped

`detectSemanticDrift(readingPath, relatedFiles)` identifies re-reads
where structurally related files were read in between.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Tracks reading path | ⚠️ Takes path as input, doesn't track it |
| Flags interpretation shift on re-reads | ✅ |
| Holonomy detection identifies loops | ✅ |
| Warnings include reading chain | ✅ intervening field |

## Gaps

1. **Doesn't track**: Caller must collect the reading path and pass it.
   The function is a detector, not a tracker.

## Drift check

- Pure function, no architecture concerns ✅
