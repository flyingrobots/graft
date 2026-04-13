---
title: "Target-repo git hook bootstrap"
legend: "SURFACE"
cycle: "0071-target-repo-git-hook-bootstrap"
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

This packet was pulled active too early and closed as `not-met` without
execution. The hook bootstrap work remains a real truthfulness win, but
it should follow the current execution set so the daemon request-path
and scheduling model are steadier before hook bootstrap becomes the next
surface push.

Live plan:
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
- Keep behind `0068 daemon-job-scheduler-and-worker-pool`
- Keep behind `0070 monitors-run-through-scheduler`

## Playback Questions

### Human

### Agent

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

Graft likely needs repo-local Git hook integration in target repos if
the product truth is "track meaningful activity between hard Git
commits" for both agent-driven and human-driven work.

The sharpest case is branch / checkout transition handling. If a user
or agent switches branches outside Graft, the active causal workspace or
future strand model needs an explicit checkout-epoch boundary instead of
silently smearing one line of work across incompatible bases.

Why this is distinct work:
- live MCP instrumentation only sees tool-mediated activity
- filesystem watchers can see edits, but they do not give durable Git
  checkpoints by themselves
- commit, checkout, merge, and rewrite are canonical transition moments
  that Git already exposes through hooks

Likely hook surfaces:
- `post-commit` for collapse checkpoints, indexing advancement, and
  commit-linked provenance projection
- `post-checkout`, `post-merge`, and `post-rewrite` for checkout epoch
  transitions, branch-switch detection, and strand/workspace-overlay
  interpretation
- possibly `pre-commit` only if we need access to staged-target intent
  before commit finalization, rather than deriving it from the resulting
  commit diff

Questions:
- should `graft init` install product hooks in the target repo, not just
  client config
- on branch switch, should Graft:
  - park the active strand
  - fork a new strand from the new base
  - or preserve one causal session with explicit transition edges
- how do we compose with an existing `core.hooksPath` or existing hook
  scripts without hijacking repo-local developer workflows
- what is the minimum lawful hook shim: thin forwarder to MCP/daemon or
  real local logic
- which events are required for persisted sub-commit local history
  versus merely nice to have
- how do we degrade honestly when hooks are absent

Related:
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/WARP_richer-semantic-transitions.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`

Effort: M
