---
title: Technical debt as measurable curvature
feature: structural-metrics
kind: leaf
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - WARP Level 1 indexing (shipped)
  - Structural churn report via WARP aggregates (shipped)
  - Refactor difficulty score (backlog)
acceptance_criteria:
  - Computes a curvature metric per symbol based on churn frequency and dependency fan-out
  - Tracks curvature over time, showing debt accumulation or discharge trends
  - Identifies the top-N highest-curvature symbols driving structural debt
  - Produces a summary report (e.g., 'structural debt grew 12% this quarter, driven by 3 symbols in src/policy/')
blocked_by:
  - WARP_refactor-difficulty-score
---

# Technical debt as measurable curvature

Debt is not a feeling. It is accumulated structural complexity
over the worldline.

Symbols that resist change (high churn, frequent signature
mutations) surrounded by dense dependencies (high fan-out) carry
measurable curvature. Track this over time. Watch debt accumulate
or discharge.

"Your codebase's structural debt grew 12% this quarter, driven
by 3 high-curvature symbols in src/policy/."

## Implementation path

1. Consume the per-symbol refactor difficulty score from
   `WARP_refactor-difficulty-score` (curvature × friction scalar)
2. Extend the score with a temporal dimension: compute the
   difficulty score at multiple points along the worldline (e.g.,
   at each tag, or at regular commit intervals)
3. Derive curvature trajectory per symbol: is the score increasing
   (debt accumulating), stable, or decreasing (debt discharging)?
4. Aggregate across symbols to produce codebase-level metrics:
   total curvature, curvature growth rate, concentration (are a
   few symbols driving most of the debt?)
5. Identify the top-N highest-curvature symbols and produce a
   structured report with: symbol name, file, curvature score,
   trend direction, dependency fan-out, churn frequency
6. Produce a summary narrative: "structural debt grew X% over
   period Y, driven by N symbols in Z"

## Why blocked by refactor-difficulty-score

`WARP_refactor-difficulty-score` (v0.7.0) computes the per-symbol
curvature × friction scalar that this card consumes as its
foundational metric. Technical debt curvature IS the refactor
difficulty score tracked over time. Without the per-symbol score,
this card would need to reimplement churn-frequency and fan-out
computation from scratch — duplicating work that the difficulty
score already delivers. **Hard dependency.**

Note: `WARP_refactor-difficulty-score` now has aggregate-backed
structural churn available, so this card's remaining hard dependency is
the difficulty score itself.

## Related cards

- **WARP_refactor-difficulty-score** (blocked_by): The per-symbol
  score that curvature tracking extends temporally. See above.
- **WARP_codebase-entropy-trajectory**: Entropy trajectory tracks
  aggregate structural metrics (addition/removal rates, signature
  stability, coupling direction) over time. Curvature tracks
  per-symbol debt metrics over time. They share the "metrics over
  time" pattern and could share the worldline-walking infrastructure,
  but compute different things. Not a hard dependency — curvature
  does not need entropy, and entropy does not need curvature.
- **WARP_dead-symbol-detection**: Dead symbols have infinite
  curvature in a sense (they were changed until they were deleted).
  Dead-symbol data could enrich the curvature narrative ("3 of
  your top-10 highest-curvature symbols were eventually deleted —
  suggesting the debt was resolved by removal, not refactoring").
  Interesting but not a prerequisite.
- **CORE_rewrite-structural-churn-to-use-warp-aggregate-queries**:
  Shipped prerequisite consumed through refactor-difficulty-score. Not
  a direct blocker of this card.

## Effort rationale

Large. The temporal extension is the main complexity: computing
difficulty scores at multiple worldline points requires efficient
historical queries (seek + aggregate at each point). Aggregation
across symbols needs design decisions (how to weight curvature,
how to define "concentration"). The summary narrative generation
is non-trivial (needs to identify the most meaningful signals,
not just dump numbers). M would be too low because of the temporal
dimension; XL would be too high because the per-symbol score
already exists (via refactor-difficulty-score) — this card extends
it, not reinvents it.
