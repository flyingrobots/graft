---
title: "Bounded neighborhood read for referencesForSymbol"
---

# Bounded neighborhood read for referencesForSymbol

When git-warp ships bounded neighborhood reads (observer geometry ladder,
Rung 2), `referencesForSymbol` becomes a one-liner: "give me the incoming
`references` neighborhood of this sym node." No traversal setup, no
observer aperture, just a semantic question. The substrate answers it
with honest support cost.

Watch for: git-warp v19+ `entity-at-coordinate` and `bounded neighborhood`
APIs.
