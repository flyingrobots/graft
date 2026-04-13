---
title: "Local causal history graph schema"
cycle: "0074-local-causal-history-graph-schema"
design_doc: "docs/design/0074-local-causal-history-graph-schema/local-causal-history-graph-schema.md"
outcome: hill-met
drift_check: yes
---

# Local causal history graph schema Retro

## Summary

Settled the first formal graph schema for Graft's local causal history
model in the repo-local git-warp graph.

The packet now defines:

- stable node families and ID namespaces for local-history identities,
  event nodes, evidence, footprints, and staged targets
- edge families for anchoring, continuity, ordering, and cross-links
  into structural truth
- explicit alignment with WARP substrate nouns and surfaces so the
  schema composes with worldlines, strands, comparison, provenance, and
  bounded revelation instead of inventing a parallel local-history
  engine
- invariants that keep local history append-only and
  `artifact_history`-scoped until later collapse/admission work
- an explicit mapping from the current JSON sidecar model to the
  graph-backed model
- implementation slices for dual-write, graph-backed reads, and JSON
  retirement

This closes as a design hill. No product code changed in this cycle.

## Playback Witness

- Repo-visible playback witness:
  - [0074-local-causal-history-graph-schema.test.ts](/Users/james/git/graft/tests/playback/0074-local-causal-history-graph-schema.test.ts:1)
- Verification note:
  - [verification.md](/Users/james/git/graft/docs/method/retro/0074-local-causal-history-graph-schema/witness/verification.md:1)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed
- [x] Priorities reviewed
- [ ] Dead work buried or merged
