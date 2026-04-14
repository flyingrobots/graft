---
title: "Anchor affinity for structural ranges in jedit"
legend: WARP
lane: asap
---

# Anchor affinity for structural ranges in jedit

Requested by `jedit`.

Context:
- `jedit` is exploring anchor-aware and causal editing.
- Comments, diagnostics, and future AI targets should ideally follow syntax-aware structure instead of relying only on raw byte offsets.

Need:
- Add an anchor-affinity or structural-anchor mapping surface for moving ranges across edits.
- Make it useful for editor-side anchors, not only repo-scale history tools.
- Keep the contract explicit about what kinds of edits it can and cannot track.
