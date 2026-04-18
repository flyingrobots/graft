---
title: "Reactive workspace overlay"
cycle: "WARP_reactive-workspace-overlay"
design_doc: "docs/design/WARP_reactive-workspace-overlay.md"
outcome: hill-met
drift_check: yes
---

# Reactive workspace overlay Retro

## Summary

`0062` met the hill by making the live workspace overlay a first-class,
inspectable product concept instead of something only inferred
opportunistically between tool calls.

This cycle shipped the missing runtime footing needed to talk honestly
about active between-commit work:

- bounded surfaces now expose explicit workspace-overlay footing with
  observation mode, degraded posture, and target-repo hook/bootstrap
  status
- `graft init --write-target-git-hooks` now installs the minimum
  target-repo transition shims for `post-checkout`, `post-merge`, and
  `post-rewrite` without overwriting external hooks
- installed target-repo hooks now append transition events under the
  repo-local `.graft/runtime/` seam and those events are consumed by
  runtime footing
- checkout-boundary continuity records now carry direct
  `git_hook_transition` evidence when hooks really observed the
  transition, instead of relying only on inferred repo snapshots
- active overlay footing now reports whether the current line of work
  is still on the stable initial footing or is a post-transition fork,
  plus whether that boundary is backed by `repo_snapshot` or
  `hook_observed` authority
- bounded guidance is now more honest after transition-caused forks:
  Graft asks for boundary review before defaulting to “continue active
  causal workspace”

The cycle also fixed a real macOS path-alias bug. Installed hook
events in temp repos were being dropped because `/private/...` and
`/var/...` worktree aliases did not compare equal. Normalizing that
equivalence at the hook-ingest seam made the runtime story match the
real repo behavior instead of the incidental path spelling.

The important honesty boundary held throughout: this is still live
workspace footing and bounded local `artifact_history`, not canonical
provenance or collapse-admitted explanation.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0062-reactive-workspace-overlay/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded during this cycle.

## Cool Ideas

- None recorded during this cycle.

## Backlog Maintenance

- [ ] Inbox processed
- [ ] Priorities reviewed
- [ ] Dead work buried or merged
