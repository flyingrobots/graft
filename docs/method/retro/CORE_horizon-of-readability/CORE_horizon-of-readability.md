# Retro: CORE_horizon-of-readability

## What shipped

`detectReadabilityHorizon(input)` detects when outline projection
provides negligible savings (compression ratio > 70%).

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Governor detects when projection can't reduce | ⚠️ Function exists but not wired into governor |
| Returns full content when horizon reached | ✅ recommendation: "content" |
| Explicit message to agent | ✅ message field |
| Based on measurable gradients, not heuristics | ⚠️ Uses 0.7 threshold — IS a heuristic |

## Gaps

1. **Not wired into governor**: Standalone function, not integrated.
2. **Threshold-based**: Card says "not heuristics" but 0.7 is a threshold.

## Drift check

- Pure function, no architecture concerns ✅
