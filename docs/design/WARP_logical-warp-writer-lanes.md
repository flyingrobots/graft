---
title: "Logical WARP writer lanes"
legend: "WARP"
cycle: "WARP_logical-warp-writer-lanes"
source_backlog: "docs/method/backlog/up-next/WARP_logical-warp-writer-lanes.md"
---

# Logical WARP writer lanes

Source backlog item: `docs/method/backlog/up-next/WARP_logical-warp-writer-lanes.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

A human or agent can inspect daemon scheduling and runtime causal
context and see that WARP writer identity is assigned to stable logical
lanes such as session work and repo monitor work, rather than to
incidental worker-process identities or one hard-coded global writer.

## Playback Questions

### Human

- [ ] Do session and monitor work get distinct, stable logical WARP
      writer lanes instead of sharing one ambient writer identity?

### Agent

- [ ] Can the daemon scheduler serialize same-lane work while allowing
      different logical lanes in the same repo to run concurrently?
- [ ] Is monitor indexing tied to a repo-scoped monitor lane instead of
      to whichever worker happened to run the tick?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: writer-lane identity must
  be legible in one hop from runtime causal context and scheduler job
  views.
- Non-visual or alternate-reading expectations: lane naming and queue
  posture should stay inspectable through text-only receipts, doctor,
  and scheduler views.

## Localization and Directionality

- Locale / wording / formatting assumptions: writer lanes use stable
  ASCII identifiers, not localized labels.
- Logical direction / layout assumptions: no bidi- or layout-sensitive
  semantics.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the mapping from
  logical job class to writer-lane ID must be stable and derivable from
  repo/session scope, not worker runtime details.
- What must be attributable, evidenced, or governed: scheduler views
  and runtime causal context must expose the lane identity actually used
  for work.

## Non-goals

- [ ] Using writer IDs as raw process/thread identities.
- [ ] Reworking WARP graph ontology beyond the lane-identity seam.
- [ ] Solving symbol rename continuity in the same cycle.

## Backlog Context

This packet was requeued after being pulled active too early. The
required substrate is now real in repo truth:

- scheduler queues and fairness are explicit in
  `src/mcp/daemon-job-scheduler.ts`
- monitor ticks run through the scheduler and use repo-scoped monitor
  lanes in `src/mcp/persistent-monitor-runtime.ts`
- runtime causal context and WARP pooling carry explicit `warpWriterId`
  instead of one implicit writer

Shipped posture:

- default foreground work still has the stable default writer `graft`
- daemon session work uses `buildSessionWarpWriterId(sessionId)`
- monitor indexing uses `buildMonitorWarpWriterId(repoId)`
- WARP pooling keys handles by `(repoId, writerId)` so same-repo
  multi-lane behavior is explicit

This closes the original queue item honestly as a lane-identity slice.
It does not claim the deeper ontology work of symbol continuity or
multi-lane causal provenance beyond current receipts/context surfaces.
