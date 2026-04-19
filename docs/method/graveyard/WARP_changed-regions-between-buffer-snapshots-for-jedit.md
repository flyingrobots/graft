---
title: Changed regions between buffer snapshots for jedit
legend: WARP
lane: graveyard
---

# Changed regions between buffer snapshots for jedit

## Disposition

Implemented via the direct StructuredBuffer diff() surface, which reports bounded changed regions between buffer snapshots with textual evidence.

## Original Proposal

Requested by `jedit`.

Context:
- For selective admission and review UI, `jedit` wants changed text regions plus changed symbols between two buffer states.
- This is a more editor-native seam than git-ref structural diff alone.

Need:
- Add a bounded changed-regions surface for old/new buffer snapshots.
- Return textual changed ranges plus structural meaning when available.
- Make it suitable for editor review panes and future causal admission UI.
