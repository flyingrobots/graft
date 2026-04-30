# Retro: WARP_adaptive-projection-selection

## What shipped

`selectProjection(candidate)` chooses outline/content/range based
on file metrics.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Minimizes structural curvature | ❌ Uses simple thresholds |
| Dense → outline, thin config → content | ✅ |
| Single-function → range | ✅ targetSymbol |
| Structural, not threshold-based | ❌ IS threshold-based |
| Overridable by user/agent | ❌ No override mechanism |
| Test: high-complexity selects outline | ✅ |

## Gaps

1. **Threshold-based, not graph-derived**: Card explicitly says
   "structural (graph-derived), not threshold-based" but implementation
   uses SMALL_FILE_THRESHOLD and HORIZON_RATIO constants.
2. **No override mechanism**: Card says overridable but isn't.

## Drift check

- Pure function, no architecture concerns ✅
