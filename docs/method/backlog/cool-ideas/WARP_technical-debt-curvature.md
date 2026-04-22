---
title: Technical debt as measurable curvature
requirements:
  - WARP Level 1 indexing (shipped)
  - Structural churn report (backlog)
  - Refactor difficulty score (backlog)
acceptance_criteria:
  - Computes a curvature metric per symbol based on churn frequency and dependency fan-out
  - Tracks curvature over time, showing debt accumulation or discharge trends
  - Identifies the top-N highest-curvature symbols driving structural debt
  - Produces a summary report (e.g., 'structural debt grew 12% this quarter, driven by 3 symbols in src/policy/')
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

Depends on: WARP Level 1 (shipped), refactor difficulty score,
structural churn report.
