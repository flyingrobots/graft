---
title: "Footprint-based parallelism"
---

# Footprint-based parallelism

Two code_show calls on non-overlapping symbols have non-overlapping
footprints. They're composable — can run in parallel without
coordination. The system knows this from the footprint structure,
not from the programmer.

"These 5 refactors can all proceed in parallel because their
footprints are disjoint." The WARP admission rule:
non-overlapping footprints are admissible together.

This is automatic parallelism discovery from structural analysis.
No locks, no coordination, no programmer annotation. The geometry
determines independence.

Depends on: WARP optics (backlog), footprint declarations.

See: aion-paper-07/optics/warp-optic.tex (Section 8)
