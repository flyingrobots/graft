---
title: "Rename preview for jedit structural edits"
legend: SURFACE
lane: asap
---

# Rename preview for jedit structural edits

Requested by `jedit`.

Context:
- `jedit` wants rename planning without blindly applying edits.
- A preview surface would let the editor show what would move before committing to a rename operation.

Need:
- Add a bounded rename preview surface for a symbol rename.
- Report affected ranges/files and changed text previews.
- Support current-buffer context where possible so the editor does not have to save first.
