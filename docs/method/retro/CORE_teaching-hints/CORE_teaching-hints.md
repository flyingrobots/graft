# Retro: CORE_graft-as-teacher + CORE_graft-teach-learning-receipts (unified)

## What shipped

`generateTeachingHint(ctx)` returns contextual hints for suboptimal
read decisions. Pure function over projection decision context.

## Acceptance criteria review (graft-as-teacher)

| Criterion | Status |
|---|---|
| Every governor response includes a hint field | ❌ Function exists but not wired into governor |
| Hints are contextual | ✅ References specific projection type |
| Teaches file_outline first, read_range for details | ✅ |
| No measurable latency | ✅ Pure function, no I/O |
| Omitted when optimal | ✅ Returns undefined |

## Gaps

1. **Not wired into governor**: The function exists but governor responses
   don't include a hint field. Integration work remains.

## Drift check

- Pure function, no imports, no architecture concerns ✅
