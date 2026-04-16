---
title: Projection bundle over buffer head for jedit
legend: SURFACE
lane: asap
blocked_by:
  - docs/method/backlog/asap/WARP_projection-basis-and-head-identity-for-jedit-warm-truth.md
---

# Projection bundle over buffer head for jedit

Requested by `jedit`.

## Context

Graft already has individual warm structural capabilities such as syntax spans,
diagnostics, folds, outline, node lookup, and semantic diff. `jedit` now needs
to consume those capabilities as one coherent warm-layer surface over a known
buffer head instead of stitching together many ad hoc calls with mismatched
bases.

This is especially important once `jedit` stops treating MCP as the primary
integration shape and starts using Graft as a built-in engine beside Echo.

## Need

Provide a bundled warm projection surface over a specific buffer head.

The bundle should be able to produce, at minimum:

- syntax spans
- diagnostics
- fold regions
- outline or structural summary
- explicit parse status / partiality signals
- basis identity for the head it was derived from

## Acceptance criteria

- Graft exposes a direct surface that can derive a coherent warm projection set
  from in-memory editor content plus basis identity.
- The bundle is truthful for dirty unsaved buffers.
- The bundle reports partial/unsupported states explicitly.
- The bundle shape is suitable for `jedit` to drive source highlighting,
  folding, diagnostics counts, and structural drawers without per-feature
  transport glue.

## Non-goals

- Designing the entire `jedit` UI contract inside Graft.
- Solving every possible projection in the first bundle.
- Making Git commits the unit of warm projection freshness.
