---
title: "Same-repo concurrent agent model"
cycle: "0064-same-repo-concurrent-agent-model"
design_doc: "docs/design/0064-same-repo-concurrent-agent-model/same-repo-concurrent-agent-model.md"
outcome: hill-met
drift_check: yes
---

# Same-repo concurrent agent model Retro

## Summary

`0064` closed the first honest same-repo concurrency contract for
Graft.

What shipped:
- bounded `repoConcurrency` posture at product surfaces
- separation between shared canonical repo scope, shared live worktree
  scope, and actor-local causal scope
- same-worktree overlap downgraded to `shared_worktree`,
  `overlapping_actors`, `divergent_checkout`, or `unknown` instead of
  fake single-actor ownership
- daemon live-session awareness so same-repo concurrency does not
  disappear just because local persisted history is session-scoped
- concurrency-aware guidance on bounded surfaces
- lawful cross-session same-worktree handoff semantics through
  `causal_attach` when exactly one live source session is identifiable

What did not ship:
- multi-writer WARP semantics
- canonical provenance merge semantics across actors
- automatic conflict resolution or collision repair

## Playback Witness

Verification witness: [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- Existing debt remains in
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-persisted-local-history-composition.md`
  because local-history storage, evidence derivation, and summary
  projection are still too coupled.

## Cool Ideas

- None recorded in this closeout.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
