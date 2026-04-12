---
title: "Async Git client via plumbing"
legend: "CORE"
cycle: "0067-async-git-client-via-plumbing"
source_backlog: "docs/method/backlog/up-next/CORE_async-git-client-via-plumbing.md"
---

# Async Git client via plumbing

Source backlog item: `docs/method/backlog/up-next/CORE_async-git-client-via-plumbing.md`
Legend: CORE

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

Replace the synchronous `GitClient` execution path with an async
adapter backed by `@git-stunts/plumbing`.

Why:
- daemon-mode Git work still routes through `spawnSync`
- one slow Git command can block unrelated daemon sessions
- Graft already depends on `@git-stunts/plumbing` for WARP open, so the
  substrate is present but underused

Scope:
- make `GitClient` async
- replace `src/adapters/node-git.ts` with a plumbing-backed adapter
- migrate repo-state, workspace binding, monitor runtime, structural
  diff helpers, and precision helpers onto the async seam
- keep runtime truth explicit when Git exits non-zero

Non-goals:
- worker-pool scheduling
- filesystem port migration
- changing WARP writer identity policy

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`

Effort: M
