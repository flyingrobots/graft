---
title: Structural selection shrink for jedit
legend: SURFACE
lane: graveyard
---

# Structural selection shrink for jedit

## Disposition

Implemented via the direct StructuredBuffer selectionShrink() surface for AST-aware selection contraction from a structured range.

## Original Proposal

Requested by `jedit`.

Context:
- If Graft can expand selections structurally for `jedit`, the inverse shrink step is also needed so the editor can move back down the syntax tree without falling back to fragile heuristics.

Need:
- Add a buffer-aware `selection_shrink` surface.
- Accept the same range contract as the expand surface.
- Return the next structurally smaller lawful range.
