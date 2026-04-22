---
title: "Bounded neighborhood read for referencesForSymbol"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "referencesForSymbol tool (shipped)"
  - "WARP Level 2 bounded neighborhood API (not shipped)"
acceptance_criteria:
  - "referencesForSymbol resolves via a single bounded-neighborhood query instead of manual traversal"
  - "No explicit observer aperture or traversal setup is required by the caller"
  - "Response includes honest support cost from the WARP substrate"
  - "Performance is equal to or better than the current traversal-based implementation"
---

# Bounded neighborhood read for referencesForSymbol

When git-warp ships bounded neighborhood reads (observer geometry ladder,
Rung 2), `referencesForSymbol` becomes a one-liner: "give me the incoming
`references` neighborhood of this sym node." No traversal setup, no
observer aperture, just a semantic question. The substrate answers it
with honest support cost.

Watch for: git-warp v19+ `entity-at-coordinate` and `bounded neighborhood`
APIs.
