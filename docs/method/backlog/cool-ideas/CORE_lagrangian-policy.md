---
title: "Lagrangian policy engine"
feature: policy
kind: trunk
legend: CORE
lane: cool-ideas
effort: XL
requirements:
  - "Budget governor (shipped)"
  - "Session depth tracking (shipped)"
  - "Policy engine with dual-threshold decisions (shipped)"
  - "Refactor difficulty score (backlog — v0.7.0)"
  - "Structural churn data via WARP aggregate queries (backlog — v0.7.0)"
acceptance_criteria:
  - "Policy decisions are computed via a multi-axis cost functional, not dual-threshold step functions"
  - "Axes include at minimum: token cost, structural complexity, session depth, and context pressure"
  - "Weights are configurable per agent profile (e.g., phone agent vs. server agent)"
  - "The current dual-threshold policy (150 lines + 12 KB) is expressible as a degenerate case of the Lagrangian"
  - "Policy transitions are smooth and continuous, not step-function jumps"
  - "Performance is comparable to current policy — no measurable latency increase on tool calls"
blocked_by:
  - WARP_refactor-difficulty-score
---

# Lagrangian policy engine

Replace dual-threshold policy with a multi-axis cost functional.

Axes: token cost, structural complexity, session depth, context
pressure, structural risk (refactor difficulty), edit-bash-loop
count, re-read frequency.

The weights encode constraints. A phone agent weights context
differently than a server agent. Same Lagrangian, different
gravitational field. Policy becomes physics, not config.

The current dual-threshold (150 lines + 12 KB) with session-depth
decay is a degenerate case of this — two axes with step-function
weights. The full Lagrangian is smooth and multi-dimensional.

## Implementation path

1. Define the `LagrangianPolicy` interface: a cost functional that takes a vector of axis values and a weight vector, returning a scalar cost and a gradient direction.
2. Define axis adapters that extract each value from existing infrastructure: token cost (from file size), structural complexity (from outline density), session depth (from session tracker), context pressure (from budget governor), structural risk (from refactor difficulty score).
3. Implement the cost computation: weighted sum of axis contributions with smooth activation functions (sigmoid or softplus) instead of step functions.
4. Ensure backward compatibility: the current dual-threshold policy is expressible as a weight vector with step-function activations on two axes, all others zeroed.
5. Wire weight vectors into `.graftrc` and policy profiles (if shipped). Each named profile becomes a weight vector.
6. Expose the cost breakdown in governor receipts so agents can see which axes drove the decision.
7. Validate that performance is not degraded — the cost computation must be sub-millisecond.

## Related cards

- **WARP_refactor-difficulty-score** (v0.7.0): Hard dependency. The "structural risk" axis requires refactor difficulty scores per symbol. Without this, the Lagrangian can launch with fewer axes but loses its most differentiating input. Blocked by this card.
- **CORE_rewrite-structural-churn-to-use-warp-aggregate-queries** (v0.7.0): Transitive dependency via refactor-difficulty-score. Churn data feeds difficulty scores, which feed the Lagrangian's risk axis.
- **CORE_policy-profiles**: Profiles become named weight vectors in the Lagrangian. Independent builds — profiles work with current thresholds, and the Lagrangian works without named profiles. But they compose powerfully.
- **CORE_self-tuning-governor**: Tuning would suggest weight adjustments instead of threshold changes. The tuning concept generalizes but the implementation differs. Independent.
- **WARP_adaptive-projection-selection**: Adaptive projection selects WHICH representation; the Lagrangian decides WHETHER to project at all and HOW aggressively. Complementary axes of the same decision space. Independent builds.
- **CORE_horizon-of-readability**: The horizon detects when no projection helps. The Lagrangian's cost functional should incorporate this — when the gradient is flat, stop optimizing. Could be an axis or a special case. Not a hard dependency.

## Dependency edges

**blocked_by: WARP_refactor-difficulty-score** — The Lagrangian's most novel axis is structural risk (refactor difficulty). Without difficulty scores, the Lagrangian is just a smoother version of the current dual-threshold policy — mathematically nicer but not meaningfully more capable. The difficulty score is what makes this "policy as physics" rather than "policy as config with better interpolation."

Note: The Lagrangian COULD ship with only shipped axes (token cost, session depth, context pressure) and add the risk axis later. But that degenerate form provides marginal value over the current policy. The full vision requires difficulty scores.

## Effort rationale

Extra-large. This replaces the core policy engine — the decision-making heart of the governor. Designing the cost functional, choosing activation functions, calibrating weights, ensuring backward compatibility, validating performance, and testing smooth transitions across the full decision space is a substantial undertaking. The math is tractable but the engineering surface is wide: every tool call flows through this path.
