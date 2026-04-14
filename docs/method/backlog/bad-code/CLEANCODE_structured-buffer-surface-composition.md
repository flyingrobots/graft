---
title: "Structured buffer surface composition"
legend: CLEANCODE
lane: bad-code
---

# Structured buffer surface composition

The new direct editor surface in `src/operations/structured-buffer.ts` now mixes parse lifecycle, syntax spans, diagnostics, injections, folds, selection growth/shrink, symbol occurrence lookup, rename preview, snapshot diff, semantic summary, and anchor affinity in one large module.

Need:
- Split model lifecycle from individual editor/query surfaces.
- Separate snapshot diff / semantic summary / anchor mapping from single-buffer queries.
- Keep the package-root direct API, but present it through smaller cohesive modules or facades.
