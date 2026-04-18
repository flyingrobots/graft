---
title: "Lagrangian policy engine"
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

Depends on: budget governor (shipped), refactor difficulty score,
structural churn data.
