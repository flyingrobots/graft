---
title: "Projection basis and head identity for jedit warm truth"
legend: "WARP"
cycle: "0084-projection-basis-and-head-identity-for-jedit-warm-truth"
source_backlog: "docs/method/backlog/asap/WARP_projection-basis-and-head-identity-for-jedit-warm-truth.md"
---

# Projection basis and head identity for jedit warm truth

Source backlog item: `docs/method/backlog/asap/WARP_projection-basis-and-head-identity-for-jedit-warm-truth.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Make Graft's direct editor-facing warm projection surface basis-aware so
every dirty-buffer result can name the hot editor head/tick it was
derived from, and every snapshot-to-snapshot result can name both sides
of the comparison.

## Playback Questions

### Human

- [ ] Can an editor integrator pass explicit head/tick identity into the
      supported direct buffer API and get that same basis back on warm
      projection results?
- [ ] For snapshot-to-snapshot operations, is it explicit which basis is
      the `from` side and which is the `to` side instead of collapsing
      the comparison into one ambiguous identity?

### Agent

- [ ] Do unsupported-language and partial-parse outcomes still stay
      explicit while carrying truthful basis metadata?
- [ ] Is the basis model transport-agnostic and small enough to support
      `jedit`'s head/tick posture without baking Echo internals into
      Graft?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: result objects should carry
  basis fields directly, not require inference from side channels.
- Non-visual or alternate-reading expectations: examples and docs should
  show basis as plain JSON-shaped data.

## Localization and Directionality

- Locale / wording / formatting assumptions: plain English and literal
  code identifiers.
- Logical direction / layout assumptions: left-to-right prose and code
  examples.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the basis fields
  on result objects and the distinction between single-buffer versus
  compared-buffer results.
- What must be attributable, evidenced, or governed: any claim that a
  warm projection is current must be grounded in explicit basis data,
  not inferred freshness.

## Non-goals

- [ ] Defining Echo's rope/worldline runtime inside Graft.
- [ ] Solving warm projection bundling in this slice.
- [ ] Introducing Git commit identity as the warm basis model.

## Backlog Context

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
