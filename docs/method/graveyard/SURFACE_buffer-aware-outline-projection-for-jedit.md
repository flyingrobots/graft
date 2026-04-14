---
title: Buffer-aware outline projection for jedit
legend: SURFACE
lane: graveyard
---

# Buffer-aware outline projection for jedit

## Disposition

Implemented via the direct StructuredBuffer outline() surface exported from the package root for dirty-buffer editor integration.

## Original Proposal

Requested by `jedit`.

Context:
- The Graft drawer inside `jedit` should reflect the live unsaved buffer, not just the file on disk.
- Existing `file_outline` behavior is valuable, but it is path-oriented and not obviously modeled as a buffer projection.

Need:
- Add a `buffer_outline`-style surface or extend the outline contract to accept optional in-memory `content`.
- Keep the current outline and jump-table shape so `jedit` can reuse it directly.
- Make the result truthful for dirty buffers without requiring a save to disk first.
