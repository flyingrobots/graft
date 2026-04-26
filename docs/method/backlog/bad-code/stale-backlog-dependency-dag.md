---
title: Backlog dependency DAG is stale after v0.7.0 burn-down
feature: method-bookkeeping
kind: leaf
legend: CLEAN_CODE
lane: bad-code
effort: S
requirements:
  - "Completed cards must leave active backlog truth surfaces"
acceptance_criteria:
  - "dependency-dag.dot and dependency-dag.svg no longer show completed v0.7.0 cards as active backlog nodes"
  - "The graph is regenerated from current backlog files or documented as archival"
---

# Backlog dependency DAG is stale after v0.7.0 burn-down

`docs/method/backlog/dependency-dag.dot` and the generated SVG still
show completed v0.7.0 cards as active nodes, including recently closed
structural metrics cards.

The file tree is the active source of truth for backlog state, but this
graph is a visible truth surface and can mislead agents or humans about
what remains.

Fix by either regenerating the graph from current backlog files or
marking the graph as archival if it is no longer maintained.
