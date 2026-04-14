---
title: "Embedded language injections for jedit highlighting"
legend: SURFACE
lane: asap
---

# Embedded language injections for jedit highlighting

Requested by `jedit`.

Context:
- `jedit` wants truthful source colorization in files that embed multiple languages such as TSX/JSX, template strings, or future markdown/code mixes.
- Without an explicit injections story, AST-backed highlighting will be shallow or wrong on common modern source formats.

Need:
- Add an injections-aware parser/output contract for embedded language regions.
- Make it usable by syntax span and buffer-aware structural surfaces.
- Prefer one coherent substrate over editor-side heuristics.
