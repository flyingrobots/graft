---
title: "Budget elasticity (progressive disclosure hints)"
requirements:
  - "Outline extraction (shipped)"
  - "Compression ratio tracking (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Outline responses include per-symbol elasticity annotations indicating marginal understanding gain from deeper reading"
  - "High-elasticity symbols (reading more resolves significant ambiguity) are distinguished from low-elasticity ones"
  - "Elasticity values are derived from structural properties, not arbitrary thresholds"
  - "An agent can use elasticity to prioritize which symbols to read next within a budget"
  - "A test verifies that a structurally complex function has higher elasticity than a trivial getter"
---

# Budget elasticity (progressive disclosure hints)

When graft returns an outline, annotate with elasticity: how
much understanding does additional reading BUY?

"Reading 40 more lines of processEvent resolves 80% of the
structural ambiguity."

vs.

"Reading the full 2000-line file adds <5% understanding beyond
the outline."

This tells the agent WHERE additional reading investment has the
highest return. Not just "you can't read this" but "here is the
most efficient next read."

Depends on: outline extraction (shipped), compression ratio
(shipped), structural complexity metrics.

See: OG-I (budget elasticity as semantic recovery per resource).
