---
title: "Target-repo git hook bootstrap"
legend: "SURFACE"
cycle: "0088-target-repo-git-hook-bootstrap"
source_backlog: "docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md"
---

# Target-repo git hook bootstrap

Source backlog item: `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
Legend: SURFACE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

`graft init --write-target-git-hooks` installs a truthful minimal hook
bootstrap in target repos, preserves external hook ownership, and lets
runtime overlay surfaces distinguish absent hooks from installed
checkout-boundary observation.

## Playback Questions

### Human

- [ ] writes target-repo git transition hooks with an explicit flag
- [ ] respects configured core.hooksPath and preserves external
      target-repo hooks
- [ ] installed target-repo git hooks append transition events when
      executed
- [ ] surfaces hook-observed checkout boundaries after an installed
      transition hook fires

### Agent

- [ ] surfaces installed target-repo git hooks without pretending local
      edit reactivity
- [ ] returns a JSON error when target-repo hook bootstrap is requested
      outside a git worktree

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: runtime overlay surfaces
  must say plainly whether checkout-boundary truth comes from installed
  hooks, observed hook events, or absence/degradation.
- Non-visual or alternate-reading expectations: hook posture must be
  inspectable through structured outputs and tests, not only through
  shell side effects.

## Localization and Directionality

- Locale / wording / formatting assumptions: none beyond English hook
  names and CLI flags.
- Logical direction / layout assumptions: none.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: installed hook
  posture, present/missing hook names, and latest observed hook event
  must be surfaced without inference.
- What must be attributable, evidenced, or governed: hook bootstrap must
  preserve external ownership and only claim checkout-boundary authority
  when a recognized Graft hook is actually installed and observed.

## Non-goals

- [ ] Solving local edit watchers or full reactive workspace overlays.
- [ ] Installing `post-commit` or other additional target-repo hooks.
- [ ] Hijacking external hook scripts or overriding `core.hooksPath`
      ownership.

## Backlog Context

Requeued after being pulled active too early. This remains a real truthfulness win, but it should follow the current execution set so the daemon request-path and scheduling model are steadier before hook bootstrap becomes the next surface push.
