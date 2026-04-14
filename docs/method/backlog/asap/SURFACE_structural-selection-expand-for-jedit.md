---
title: "Structural selection expand for jedit"
legend: SURFACE
lane: asap
---

# Structural selection expand for jedit

Requested by `jedit`.

Context:
- `jedit` wants semantic selection growth from a cursor or range using AST structure instead of raw text heuristics.
- This would support cleaner editor interactions, especially for code objects and buffer-aware refactor flows.

Need:
- Add a buffer-aware `selection_expand` surface.
- Accept `path`, optional `content`, and a point/range.
- Return the next structurally larger lawful range.
