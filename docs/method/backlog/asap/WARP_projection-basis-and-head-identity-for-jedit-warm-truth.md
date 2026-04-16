---
title: Projection basis and head identity for jedit warm truth
legend: WARP
lane: asap
---

# Projection basis and head identity for jedit warm truth

Requested by `jedit`.

## Context

`jedit` is now formalizing its hot runtime around Echo-backed rope heads,
ticks, and edit groups. Graft is the warm structural engine over that truth.
For the editor to stay honest, warm projections must be attributable to a
specific hot basis.

Without explicit head identity, syntax spans, diagnostics, folds, or outline
results can masquerade as current even after the buffer head has advanced.
`jedit` needs a first-class way to know which hot head a warm projection was
derived from so stale structure can be recognized instead of guessed.

## Need

Give warm projection results an explicit basis tied to editor truth.

That basis should make it possible to say:

- this projection was derived from head/tick X
- the editor is now at head/tick Y
- therefore the projection is current, stale, or incomparable

## Acceptance criteria

- The direct Graft editor-facing projection surface can identify the hot basis
  it was derived from.
- The contract is compatible with `jedit`’s Echo-shaped head/tick model.
- Partial parse and unsupported-language outcomes stay explicit instead of
  collapsing into fake certainty.
- The basis model is transport-agnostic so it works for direct API use, not
  just MCP envelopes.

## Non-goals

- Defining Echo’s hot rope-worldline contract inside Graft.
- Solving all cross-session persistence questions.
- Forcing Git commits to act as projection identity.
