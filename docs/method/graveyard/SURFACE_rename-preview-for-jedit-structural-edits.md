---
title: Rename preview for jedit structural edits
legend: SURFACE
lane: graveyard
---

# Rename preview for jedit structural edits

## Disposition

Implemented via the direct StructuredBuffer renamePreview() surface for bounded file-local rename planning against the live buffer.

## Original Proposal

Requested by `jedit`.

Context:
- `jedit` wants rename planning without blindly applying edits.
- A preview surface would let the editor show what would move before committing to a rename operation.

Need:
- Add a bounded rename preview surface for a symbol rename.
- Report affected ranges/files and changed text previews.
- Support current-buffer context where possible so the editor does not have to save first.
