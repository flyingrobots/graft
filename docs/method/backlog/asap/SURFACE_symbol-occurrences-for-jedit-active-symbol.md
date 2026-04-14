---
title: "Symbol occurrences for jedit active symbol"
legend: SURFACE
lane: asap
---

# Symbol occurrences for jedit active symbol

Requested by `jedit`.

Context:
- `jedit` wants same-symbol highlighting under cursor and quick occurrence navigation.
- This should work against the current editor state rather than only committed or saved content.

Need:
- Add a surface that returns occurrences for the symbol at cursor or an explicit symbol.
- Support current-file and optionally workspace scope.
- Accept optional buffer content for truthful dirty-buffer behavior.
