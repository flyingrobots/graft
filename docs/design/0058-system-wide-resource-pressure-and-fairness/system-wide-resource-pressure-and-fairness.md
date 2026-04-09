# System-wide resource pressure and fairness

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-resource-pressure-and-fairness.md`
Legend: SURFACE

## Sponsors

- Human: TBD
- Agent: TBD

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

After the multi-repo overview exists, make daemon-wide pressure and
fairness explicit across many repos.

Goals:

- surface backlog pressure across repo-scoped monitors without
  collapsing all repos into one noisy stream
- define fair scheduling so one hot repo does not starve others
- make failure, lag, and inactivity visible in a bounded machine-
  readable way
- keep fairness observational and local-user, not permission-granting

Questions:

- what signals matter most:
  - backlog size
  - time since last successful monitor run
  - active session count
  - recent tick cost
  - failing monitor count
- should fairness apply per repo, per worker kind, or per daemon
  session demand
- how should this relate to future same-repo concurrent-agent work

Related:

- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/cool-ideas/WARP_background-indexing.md`

Effort: M
