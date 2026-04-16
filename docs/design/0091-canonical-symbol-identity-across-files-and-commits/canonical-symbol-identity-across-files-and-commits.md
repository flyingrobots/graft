---
title: "Canonical symbol identity across files and commits"
legend: "WARP"
cycle: "0091-canonical-symbol-identity-across-files-and-commits"
source_backlog: "docs/method/backlog/up-next/WARP_canonical-symbol-identity-across-files-and-commits.md"
---

# Canonical symbol identity across files and commits

Source backlog item: `docs/method/backlog/up-next/WARP_canonical-symbol-identity-across-files-and-commits.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Level 2 WARP reads now expose a canonical `sid:*` symbol identity that
survives commit-to-commit evolution, same-file renames, and git-reported
file moves, while leaving Level 1 `sym:<path>:<name>` addresses honest and
non-canonical.

## Playback Questions

### Human

- [ ] Does an indexed symbol keep the same canonical sid identity when a
      function is renamed in place across commits?
- [ ] Does a git-reported file move preserve the same canonical sid
      identity and expose it through indexed precision reads?

### Agent

- [ ] Does the WARP indexer seed identity from prior graph truth through
      observers instead of mining materialization receipts?
- [ ] Do indexed precision surfaces expose canonical identity without
      pretending live parse or address keys are themselves stable identity?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the identity model must stay
  explicit and small: `sym:` is address, `sid:` is canonical identity,
  continuity remains additive evidence.
- Non-visual or alternate-reading expectations: observer-visible identity must
  be readable as plain structured text, not only implied by graph topology.

## Localization and Directionality

- Locale / wording / formatting assumptions: canonical identity uses ASCII
  `sid:*` anchors and does not depend on locale-sensitive formatting.
- Logical direction / layout assumptions: continuity direction is old → new
  across commit evolution, but identity itself is direction-neutral.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: when indexed WARP truth
  is available, precision matches and code-show results must surface the
  canonical `identityId`; address keys alone are not enough.
- What must be attributable, evidenced, or governed: same-file rename carryover
  uses explicit continuity evidence, and cross-file carryover only upgrades to
  canonical identity when git/WARP history provides a stable predecessor path.

## Non-goals

- [ ] Canonical identity for live parse-only, unindexed, or dirty working-tree
      reads
- [ ] Claiming certainty for ambiguous multi-candidate rename/move cases
- [ ] Replacing Level 1 address keys with canonical identity as the primary
      query surface
- [ ] Projecting canonical identity into every structural surface in this slice
      (`graft_diff`, `graft_since`, changed views)

## Backlog Context

The 0090 continuity slice now emits explicit likely rename continuity for same-file structural diffs, but Graft still does not have canonical symbol identity that survives cross-file moves, commit-to-commit evolution, or provenance-bearing continuity beyond address-level `sym:<path>:<name>` plus additive hints.

Desired next shape:
- define canonical symbol identity beyond address and likely rename continuity
- carry identity across file moves and commit boundaries
- make confidence / certainty posture explicit where identity is ambiguous
- project that identity into diff, since, and precision surfaces without pretending Level 1 addresses are stable identity

## Shipped Shape

This slice establishes canonical identity as a WARP concern rather than a
parser-only guess.

- the indexer now writes canonical `sid:*` anchor nodes and records
  `identityId` on symbol nodes
- same-file rename continuity can carry identity forward across incremental
  indexing
- git-reported file renames can carry identity across file-path changes
- indexed precision reads (`code_find`, `code_show`) can expose canonical
  identity directly
- commit ceilings now come from observer-readable commit facts instead of
  `materializeReceipts()` mining

This is intentionally bounded. Structural diff/since surfaces and live parse
reads are still not canonical-identity surfaces, and they should not pretend
otherwise.
