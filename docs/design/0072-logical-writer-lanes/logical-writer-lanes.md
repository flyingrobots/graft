---
title: "Logical WARP writer lanes"
legend: "WARP"
cycle: "0072-logical-writer-lanes"
source_backlog: "docs/method/backlog/up-next/WARP_logical-writer-lanes.md"
---

# Logical WARP writer lanes

Source backlog item: `docs/method/backlog/up-next/WARP_logical-writer-lanes.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

TBD

## Playback Questions

### Human

- [ ] TBD

### Agent

- [ ] TBD

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: TBD
- Non-visual or alternate-reading expectations: TBD

## Localization and Directionality

- Locale / wording / formatting assumptions: TBD
- Logical direction / layout assumptions: TBD

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: TBD
- What must be attributable, evidenced, or governed: TBD

## Non-goals

- [ ] TBD

## Backlog Context

Stop treating WARP writer identity as a single hard-coded global writer
or as an incidental executor identity.

Why:
- `git-warp` supports multiple writers per graph
- worktrees of the same repo share `refs/warp/...` through the common
  Git dir
- writer IDs should describe logical mutation streams, not physical
  worker threads or processes

Design leaning:
- assign stable writer IDs to logical lanes such as:
  - monitor indexing for a repo
  - repo-scoped maintenance
  - future interactive structural write streams
- keep provenance stable if jobs migrate between workers
- make same-repo multi-writer behavior explicit rather than accidental

Questions:
- which job classes truly need distinct writer lanes
- how should writer-lane identity appear in receipts or observability
- how should this feed the same-repo concurrent-agent model

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: M
