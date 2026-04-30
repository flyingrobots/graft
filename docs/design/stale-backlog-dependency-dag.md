---
title: Backlog dependency DAG is stale after v0.7.0 burn-down
feature: method-bookkeeping
kind: leaf
legend: CLEAN_CODE
lane: bad-code
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
requirements:
  - "Completed cards must leave active backlog truth surfaces"
acceptance_criteria:
  - "dependency-dag.dot and dependency-dag.svg no longer show completed v0.7.0 cards as active backlog nodes"
  - "The graph is regenerated from current backlog files or documented as archival"
---

# Backlog dependency DAG is stale after v0.7.0 burn-down

## Relevance

Relevant. The backlog graph is a visible truth surface and should not advertise
completed cards as active work.

## Original Card

`docs/method/backlog/dependency-dag.dot` and the generated SVG still show
completed v0.7.0 cards as active nodes, including recently closed structural
metrics cards.

The file tree is the active source of truth for backlog state, but this graph
is a visible truth surface and can mislead agents or humans about what remains.

Fix by either regenerating the graph from current backlog files or marking the
graph as archival if it is no longer maintained.

## Design

Regenerate the DOT and SVG from active backlog files so the graph reflects
current lanes.

## Tests

`dot -Tsvg docs/method/backlog/dependency-dag.dot -o docs/method/backlog/dependency-dag.svg`
completed successfully, and `pnpm test` passed.
