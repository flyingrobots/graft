---
title: Refactor difficulty score
legend: WARP
lane: v0.7.0
requirements:
  - "Structural churn data from WARP aggregate queries"
  - "Cross-file reference edges in WARP graph (shipped via indexHead)"
acceptance_criteria:
  - "A scalar difficulty score per symbol combining curvature and friction"
  - "Agents can query the score to decide refactor vs workaround"
---

# Refactor difficulty score

Curvature × friction, computed from the WARP worldline.

Curvature = how sensitive this symbol is to change (churn
frequency, signature instability over time). Friction = how many
other symbols depend on it (structural fan-out via contains/
child_of/call edges).

High curvature × high friction = "don't touch without a plan."
Low curvature × low friction = safe to refactor freely.

Output: a scalar per symbol. Agents use it to decide whether to
refactor or work around. Humans use it to prioritize tech debt.

Depends on: WARP Level 1 (shipped), structural churn data.
