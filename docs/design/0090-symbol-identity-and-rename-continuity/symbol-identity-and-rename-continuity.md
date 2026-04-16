---
title: "Symbol identity and rename continuity"
legend: "WARP"
cycle: "0090-symbol-identity-and-rename-continuity"
source_backlog: "docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md"
---

# Symbol identity and rename continuity

Source backlog item: `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

A human or agent can inspect structural diffs and see explicit
confidence-rated rename continuity when a symbol keeps the same
structural shape under a new name, without pretending that Level 1
`sym:<path>:<name>` addresses are themselves stable identity.

## Playback Questions

### Human

- [ ] Do structural diff surfaces report likely rename continuity as an
      additive relation instead of collapsing old and new symbol
      addresses into one fake identity?

### Agent

- [ ] Do same-file function and class renames now surface confidence and
      basis for continuity instead of only remove + add?
- [ ] Does the editor semantic summary now rely on the shared continuity
      relation instead of a private rename heuristic?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: continuity must be visible
  in plain JSON/text diff results without requiring graph spelunking.
- Non-visual or alternate-reading expectations: confidence and basis
  fields must stay explicit and text-readable.

## Localization and Directionality

- Locale / wording / formatting assumptions: continuity metadata uses
  stable ASCII enum labels.
- Logical direction / layout assumptions: none beyond ordinary text
  ordering.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the continuity
  relation, confidence, and matching basis must be machine-readable in
  diff outputs.
- What must be attributable, evidenced, or governed: the system must
  preserve Level 1 add/remove truth even when it emits a likely rename
  continuity relation.

## Non-goals

- [ ] Claiming that `sym:` addresses are canonical identity.
- [ ] Solving cross-file or cross-commit canonical symbol IDs in this
      slice.
- [ ] Papering over ambiguous rename cases as certainty.

## Backlog Context

This packet was requeued after being pulled active too early. The
required substrate is now in place: scheduler/monitor lanes are real,
local history is graph-backed, and the remaining live gap is the
product-level continuity story on top of Level 1 symbol addresses.

Shipped slice:

- `OutlineDiff` now carries an additive `continuity` relation with
  explicit `kind`, `confidence`, and `basis`
- continuity currently emits `rename` + `likely` when removed and added
  symbols have matching signature shape or matching child structure
- Level 1 add/remove entries remain intact; continuity does not pretend
  that `sym:` addresses are canonical identity
- `StructuredBuffer#semanticSummary()` now relies on the shared diff
  continuity relation instead of a private rename heuristic

This closes the queue item as a real first continuity slice. It does
not claim cross-file or cross-commit canonical symbol IDs; if those are
needed later, they should land as a follow-up WARP packet instead of
quietly broadening this one.
