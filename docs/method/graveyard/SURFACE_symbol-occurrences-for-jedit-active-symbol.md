---
title: Symbol occurrences for jedit active symbol
legend: SURFACE
lane: graveyard
---

# Symbol occurrences for jedit active symbol

## Disposition

Implemented via the direct StructuredBuffer symbolOccurrences() surface for live-buffer active-symbol highlighting and navigation.

## Original Proposal

Requested by `jedit`.

Context:
- `jedit` wants same-symbol highlighting under cursor and quick occurrence navigation.
- This should work against the current editor state rather than only committed or saved content.

Need:
- Add a surface that returns occurrences for the symbol at cursor or an explicit symbol.
- Support current-file and optionally workspace scope.
- Accept optional buffer content for truthful dirty-buffer behavior.
