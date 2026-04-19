---
title: "Daemon job scheduler and worker pool"
legend: "SURFACE"
cycle: "0087-daemon-job-scheduler-and-worker-pool"
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

Daemon mode uses one explicit scheduler plus one worker-pool substrate
for heavy repo work, with fairness visible in daemon status and with
persistent monitors competing lawfully with foreground jobs instead of
bypassing execution accounting.

## Playback Questions

### Human

- [ ] Can one hot repo or one slow request no longer starve unrelated
      daemon sessions by default?
- [ ] Do background monitors run through the same pressure and fairness
      scheduler as foreground repo work?

### Agent

- [ ] Is the scheduling model explicit about what is fair per repo, per
      session, and per worker kind?
- [ ] Does the daemon keep session state authoritative in-process while
      workers execute against immutable snapshots and return deltas?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: daemon-wide status should
  expose scheduler and worker counts directly instead of forcing hosts
  to infer pressure from incidental monitor or session behavior.
- Non-visual or alternate-reading expectations: fairness and worker
  state must remain visible through structured status payloads and test
  evidence, not just through timing-sensitive terminal behavior.

## Localization and Directionality

- Locale / wording / formatting assumptions: none beyond English tool
  and status labels.
- Logical direction / layout assumptions: none.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: queued vs running
  job state, job priority, writer-lane identity, and worker-pool mode
  must be inspectable through daemon status and unit tests.
- What must be attributable, evidenced, or governed: background monitor
  work must use the same scheduler surface as foreground daemon work so
  pressure accounting stays truthful.

## Non-goals

- [ ] Designing logical WARP writer lanes beyond the current writer ID
      lane model.
- [ ] Adding new monitor kinds beyond `git_poll_indexer`.
- [ ] Solving target-repo git hook bootstrap or symbol identity work.

## Backlog Context

Requeued after being pulled active too early. This remains important, but it should follow the immediate execution work in 0069 and the async Git substrate in 0067 so scheduling is built on the right seams rather than on top of more placeholder state.
