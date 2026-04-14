---
title: "Fold regions from AST structure for jedit"
legend: SURFACE
lane: asap
---

# Fold regions from AST structure for jedit

Requested by `jedit`.

Context:
- `jedit` wants code folding based on real structure rather than regex or indentation guesses.
- This should also leave room for markdown heading folds later, but the immediate need is parser-backed source folding.

Need:
- Add a buffer-aware `fold_regions` surface.
- Return lawful foldable ranges from AST structure.
- Degrade honestly for unsupported languages instead of inventing folds.
