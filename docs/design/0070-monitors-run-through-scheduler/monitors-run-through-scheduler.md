---
title: "Monitors run through scheduler"
legend: "SURFACE"
cycle: "0070-monitors-run-through-scheduler"
source_backlog: "docs/method/backlog/up-next/SURFACE_monitors-run-through-scheduler.md"
---

# Monitors run through scheduler

Source backlog item: `docs/method/backlog/up-next/SURFACE_monitors-run-through-scheduler.md`
Legend: SURFACE

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

Route persistent monitor ticks through the same scheduler and pressure
model as foreground daemon work.

Why:
- background indexing should not silently starve interactive agents
- fairness is incomplete if monitors keep bypassing queueing
- daemon-wide pressure needs one truthful source of work accounting

Deliverables:
- monitor tick jobs enqueued with explicit priority
- per-repo backlog and lag signals derived from scheduler-aware state
- clear monitor lifecycle semantics when the scheduler is saturated or
  unavailable

Non-goals:
- new monitor kinds beyond `git_poll_indexer`

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`
- `docs/method/backlog/cool-ideas/WARP_background-indexing.md`

Effort: M
