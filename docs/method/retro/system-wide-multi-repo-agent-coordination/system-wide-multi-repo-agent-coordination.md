---
title: "System-wide multi-repo agent coordination Retro"
---

# System-wide multi-repo agent coordination Retro

Design: `docs/design/0056-system-wide-multi-repo-agent-coordination/system-wide-multi-repo-agent-coordination.md`
Outcome: Shaped the bounded system-wide coordination model for the local
daemon. Canonical repo identity, live worktree identity, and daemon
session identity are now explicit layers; system-wide coordination is
defined as observational and authorization-filtered; and the vague
"multi-repo coordination" item is split into concrete follow-on backlog
for repo overview and fairness.

## What changed

- defined the identity split:
  - repo = `git common dir`
  - worktree = resolved `show-toplevel`
  - session = daemon transport session id
- defined what truth stays repo-scoped, worktree-scoped, session-scoped,
  and system-scoped
- defined the bounded system-wide contract:
  - aggregate daemon counts are safe globally
  - filtered repo rows are derived from authorization and daemon-owned
    runtime state
  - raw session-local content stays private
- kept same-repo concurrency separate from cross-repo coordination
- split the next implementation work into:
  - `SURFACE_system-wide-repo-overview-and-filtered-inspection`
  - `SURFACE_system-wide-resource-pressure-and-fairness`

## Playback answers

- The repo/worktree/session boundary is now explicit.
- The system-wide view stays observational and authorization-filtered.
- Same-repo concurrency remains separate instead of being blurred into
  cross-repo coordination.
- The next work is now concrete and ranked instead of staying one
  abstract product blob.

## Verification

See `docs/method/retro/0056-system-wide-multi-repo-agent-coordination/witness/verification.md`.

## New Debt

- none
