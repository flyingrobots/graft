---
title: "Daemon job scheduler and worker pool"
legend: "SURFACE"
cycle: "0068-daemon-job-scheduler-and-worker-pool"
source_backlog: "docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md"
---

# Daemon job scheduler and worker pool

Source backlog item: `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`
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

Introduce an explicit scheduler for heavy daemon work instead of
executing repo-scoped jobs directly on the request path.

Why:
- one hot repo or slow request can still delay unrelated daemon
  sessions
- fairness needs a real execution model, not just monitoring
- background monitor ticks should compete lawfully with foreground work

Deliverables:
- session-slice identity for queued work
- immutable job envelope contract
- result-delta protocol back to the daemon control plane
- bounded queue and worker status inspection
- fairness posture across repos, with lower-priority background work

Questions:
- v1 `worker_threads` or child processes
- one active interactive job per session or looser concurrency
- cancellation, timeout, and retry posture

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/WARP_logical-writer-lanes.md`
- `docs/method/backlog/up-next/SURFACE_monitors-run-through-scheduler.md`

Effort: L
