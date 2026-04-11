---
title: "WARP graph ontology and causal collapse model"
cycle: "0059-graph-ontology-and-causal-collapse-model"
design_doc: "docs/design/0059-graph-ontology-and-causal-collapse-model/graph-ontology-and-causal-collapse-model.md"
outcome: hill-met
drift_check: yes
---

# WARP graph ontology and causal collapse model Retro

## Summary

`0059` met the hill as a design-and-contract packet.

This cycle settled the first honest ontology for Graft's WARP future:

- canonical structural truth and canonical provenance are separate
- product session identity is not transport-session identity
- checkout epochs are first-class footing boundaries
- collapse defaults to causal-slice admission by staged target, not
  whole-session admission
- provenance surfaces must explicitly say whether they are reporting
  `artifact_history`, `canonical_provenance`, or `inference`

The cycle also made that meaning inspectable in code instead of leaving
it only in prose:

- playback witnesses for the ontology contract live in
  `tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts`
- typed local contracts live in `src/contracts/causal-ontology.ts`
- runtime-local footing now exposes causal IDs and a bounded staged
  target surface through `doctor`

The important boundary stayed honest throughout the cycle: full
strand-aware causal collapse remains blocked on upstream `git-warp
v17.1.0+`. `0059` still shipped because its job was to settle ontology,
identity, witness shape, and runtime-local seams on the Graft side so
later implementation does not churn.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0059-graph-ontology-and-causal-collapse-model/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None beyond existing backlog:
  - rename continuity remains a separate WARP concern
  - full causal collapse implementation remains gated on upstream
    `git-warp`

## Cool Ideas

- None recorded in closeout beyond backlog already captured during the
  cycle.

## Backlog Maintenance

- [ ] Inbox processed
- [ ] Priorities reviewed
- [ ] Dead work buried or merged
