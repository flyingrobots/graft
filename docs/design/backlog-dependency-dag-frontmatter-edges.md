---
title: "Backlog dependency DAG renders frontmatter edges"
feature: method-bookkeeping
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: audit
cycle: backlog-dependency-dag-frontmatter-edges
status: completed
retro: "docs/method/retro/backlog-dependency-dag-frontmatter-edges/retro.md"
requirements:
  - "Backlog dependency DAG is a release steering truth surface"
  - "Capability probe identified missing dependency edges as broken truth"
acceptance_criteria:
  - "dependency-dag.dot renders blocked_by edges"
  - "dependency-dag.dot renders blocking edges"
  - "dependency-dag.dot renders blocked_by_external edges"
  - "dependency-dag.svg regenerates from the true DOT"
  - "Focused regression test fails when checked-in DOT drifts from active card frontmatter"
---

# Backlog dependency DAG renders frontmatter edges

## Relevance

Relevant. The dependency DAG is supposed to steer release pull order. A graph
with current nodes but missing edges makes blocked work look independent.

## Context

The earlier `stale-backlog-dependency-dag` cycle removed completed cards from
the active graph. The capabilities probe found a narrower remaining breakage:
the active graph still omitted dependency edges declared in backlog card
frontmatter.

## Design

Add a small docs-maintenance generator at
`scripts/generate-backlog-dependency-dag.ts` that reads active backlog cards
from `docs/method/backlog/*/*.md` and renders:

- `blocked_by`: dependency card to blocked card
- `blocking`: blocking card to dependent card
- `blocked_by_external`: external blocker to blocked card

Keep unresolved internal references visible as dashed red nodes instead of
silently dropping them. Do not infer backlog semantics or rewrite cards in the
generator.

## Tests

Add a focused unit test that:

- asserts the checked-in DOT is exactly generated from active backlog
  frontmatter
- proves `blocked_by`, `blocking`, and `blocked_by_external` render as graph
  edges

## Playback

The regenerated graph should show the v0.7.0 chains:

- `SURFACE_agent-dx-governed-edit` -> `CORE_agent-drift-warning`
- `SURFACE_agent-dx-governed-edit` -> `SURFACE_governed-write-tools`
- `CORE_daemon-aware-stdio-bridge-for-mcp-clients` ->
  `CORE_opt-in-daemon-mode-mcp-bootstrap` ->
  `SURFACE_bijou-tui-for-graft-daemon-control-plane`
- `CORE_rewrite-structural-blame-to-use-warp-worldline-provenance` ->
  `CORE_git-graft-enhance`
- `git-warp observer geometry ladder (Rung 2-4)` ->
  `CORE_migrate-to-slice-first-reads`
