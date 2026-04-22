---
title: Codebase entropy trajectory
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - CORE_rewrite-structural-churn-to-use-warp-aggregate-queries
blocking:
  - WARP_counterfactual-refactoring
requirements:
  - WARP Level 1 indexing (shipped)
  - Worldline seek API (shipped)
  - Structural churn report via WARP aggregates (backlog)
acceptance_criteria:
  - A command or tool computes structural entropy over a range of commits on the worldline
  - Output includes trends for symbol addition/removal rate, signature stability, and export surface growth
  - Coupling direction (increasing vs decreasing) is reported
  - Results are presented as a trajectory (time series), not a single-point snapshot
  - A test verifies that adding symbols across multiple commits increases the reported entropy metric
---

# Codebase entropy trajectory

The WARP worldline is a time series of structural state. Compute
structural entropy over time.

Are symbols added faster than removed? Are signatures stabilizing
or churning? Is the export surface growing linearly or
exponentially? Is coupling increasing or decreasing?

This is the health TRAJECTORY of a codebase — not a snapshot,
a trend. "Your structural entropy increased 15% this quarter"
is a sentence no other tool can produce.

## Implementation path

1. Walk the worldline over a commit range
2. At each tick, query aggregate change counts via WARP
   (`QueryBuilder.aggregate()` from the churn rewrite)
3. Compute per-tick metrics: addition rate, removal rate,
   signature change rate, export surface delta
4. Derive entropy measures: Shannon entropy over symbol
   distribution, churn velocity, coupling coefficients
5. Return as a time series with per-tick and trend-line values

## Why blocked by structural-churn rewrite

Entropy computes OVER churn data. The current churn implementation
walks git commits and accumulates counts in-memory. The WARP
rewrite (`CORE_rewrite-structural-churn-to-use-warp-aggregate-queries`)
provides native aggregate queries — essential when computing
entropy across potentially hundreds of commits. Without efficient
aggregation, entropy computation would be prohibitively slow.

## Why blocks counterfactual-refactoring

`WARP_counterfactual-refactoring` lists "structural entropy and
coupling metrics" as a requirement. Counterfactual refactoring
forks the worldline and compares alternative refactors by their
entropy scores. This card provides those scores.

## Related cards

- **WARP_technical-debt-curvature**: "Technical debt as measurable
  curvature" likely consumes entropy metrics. Related but not
  verified as a hard dependency — curvature may define its own
  metrics.
- **WARP_dead-symbol-detection**: Dead-symbol rates feed into
  addition/removal entropy, but dead-symbol-detection is a
  per-symbol query while entropy is aggregate. No hard dependency.

## Effort rationale

Medium. The computation is non-trivial (entropy metrics, trend
lines, coupling coefficients) but the data access is
straightforward once the churn rewrite provides aggregate queries.
