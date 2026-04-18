---
title: "Persisted sub-commit local history"
cycle: "WARP_persisted-sub-commit-local-history"
design_doc: "docs/design/WARP_persisted-sub-commit-local-history.md"
outcome: hill-met
drift_check: yes
---

# Persisted sub-commit local history Retro

## Summary

`0060` met the hill as the first runtime-facing persisted local-history
packet.

This cycle made Graft's between-commit `artifact_history` durable and
inspectable without overclaiming it as either Git commit history or
admitted canonical provenance.

The delivered contract is now real in code:

- bounded persisted local-history records survive reconnects under the
  stable Graft root instead of dying with one workspace slice
- continuity is anchored to `repoId`, `causalSessionId`, `strandId`,
  and `checkoutEpochId`, not just transport-session lifetime
- checkout-boundary changes now park/fork continuity instead of
  smearing one line of work across incompatible footing
- `causal_status` gives a direct bounded surface for "what causal
  workspace is active right now?"
- `causal_attach` adds explicit attach / handoff evidence instead of
  relying only on inferred transport/worktree/writer signals
- continuity summaries now carry bounded evidence and confidence rather
  than pretending stronger certainty than the runtime actually has

The cycle stayed honest about its boundary. It did not implement full
strand-aware causal collapse. It delivered the local persistence and
inspection substrate that later provenance and collapse work can build
on once upstream `git-warp v17.1.0+` support exists.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0060-persisted-sub-commit-local-history/witness/verification.md)

## Drift

- None recorded.

## New Debt

- Added during cycle:
  - [CLEAN_CODE_mcp-persisted-local-history-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-persisted-local-history-composition.md)

The persistence seam is now doing enough work that storage,
continuity policy, evidence derivation, and summary projection should
eventually be separated.

## Cool Ideas

- None beyond backlog already captured during the cycle.

## Backlog Maintenance

- [ ] Inbox processed
- [ ] Priorities reviewed
- [ ] Dead work buried or merged
