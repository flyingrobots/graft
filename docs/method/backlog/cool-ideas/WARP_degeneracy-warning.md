---
title: "Degeneracy warning"
requirements:
  - "Outline extraction (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Outline responses flag symbols where the projection is degenerate (hides important behavioral differences)"
  - "Degeneracy is quantified as conditional entropy H(History | Observer Output)"
  - "Symbols with high degeneracy include an explicit warning to read deeper before deciding"
  - "Methods with identical signatures but vastly different control flow complexity are flagged"
  - "A test verifies that two methods with matching signatures but 10x complexity difference produce a degeneracy warning"
---

# Degeneracy warning

When graft returns an outline, flag symbols where the projection
is degenerate — where the structural summary hides important
behavioral differences.

"Two methods share identical signatures but differ in control
flow complexity by 10x. This outline has high degeneracy."

The agent is told: your current view collapses distinctions that
matter. Read deeper before deciding.

Degeneracy = conditional entropy H(History | Observer Output).
Higher values = more collapsed ambiguity.

Depends on: outline extraction (shipped), structural complexity
metrics.

See: OG-I (degeneracy as dual of aperture).
