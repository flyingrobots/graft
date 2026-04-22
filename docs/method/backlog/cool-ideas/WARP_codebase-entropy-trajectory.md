---
title: Codebase entropy trajectory
requirements:
  - WARP Level 1 indexing (shipped)
  - Worldline seek API (shipped)
  - Structural churn report (backlog)
acceptance_criteria:
  - A command or tool computes structural entropy over a range of commits on the worldline
  - Output includes trends for symbol addition/removal rate, signature stability, and export surface growth
  - Coupling direction (increasing vs decreasing) is reported
  - Results are presented as a trajectory (time series), not a single-point snapshot
  - A test verifies that adding symbols across multiple commits increases the reported entropy metric
blocked_by:
  - CORE_rewrite-structural-churn-to-use-warp-aggregate-queries
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

Depends on: WARP Level 1 (shipped), structural churn report
(backlog).
