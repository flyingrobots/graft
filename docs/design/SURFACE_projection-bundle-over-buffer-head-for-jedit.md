---
title: "Projection bundle over buffer head for jedit"
legend: "SURFACE"
cycle: "SURFACE_projection-bundle-over-buffer-head-for-jedit"
source_backlog: "docs/method/backlog/asap/SURFACE_projection-bundle-over-buffer-head-for-jedit.md"
---

# Projection bundle over buffer head for jedit

Source backlog item: `docs/method/backlog/asap/SURFACE_projection-bundle-over-buffer-head-for-jedit.md`
Legend: SURFACE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

`jedit` can ask Graft for one coherent warm projection bundle over a
known editor head and receive syntax spans, diagnostics, folds,
outline, and explicit parse-status truth with one shared basis
identity.

## Playback Questions

### Human

- [ ] Can Graft derive one coherent warm projection bundle from
      in-memory editor content plus explicit basis identity instead of
      forcing Jedit to stitch together separate calls?
- [ ] Is the bundle still truthful for dirty unsaved buffers with parse
      damage by reporting explicit partial parse status?
- [ ] Do unsupported-language buffers stay explicit at the bundle level
      instead of forcing the host to infer unsupported from several
      empty sub-results?

### Agent

- [ ] Can the same bundle contract be obtained from an already-created
      StructuredBuffer without changing the basis identity?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: One bundle object should
  expose bundle-level parse truth directly so hosts do not have to
  synthesize state across several independent projections.
- Non-visual or alternate-reading expectations: Bundle fields must stay
  explicit and machine-readable for screen-reader-friendly host UIs and
  assistive editor flows.

## Localization and Directionality

- Locale / wording / formatting assumptions: No locale-specific
  formatting. Result strings stay structural and English-neutral where
  possible.
- Logical direction / layout assumptions: None. Buffer ranges remain
  logical row/column coordinates.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: bundle basis,
  parse status, and unsupported/partial signals must be directly
  inspectable without inferring hidden state.
- What must be attributable, evidenced, or governed: every nested
  projection in the bundle must preserve the same basis identity so the
  host can detect stale head/tick mismatches lawfully.

## Non-goals

- [ ] Designing the entire `jedit` UI contract inside Graft.
- [ ] Solving every possible projection in the first bundle.
- [ ] Making Git commits the unit of warm projection freshness.

## Backlog Context

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
