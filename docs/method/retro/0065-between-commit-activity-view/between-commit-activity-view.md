---
title: "Between-commit activity view"
cycle: "0065-between-commit-activity-view"
design_doc: "docs/design/0065-between-commit-activity-view/between-commit-activity-view.md"
outcome: hill-met
drift_check: yes
---

# Between-commit activity view Retro

## Summary

`0065` closed the first honest human-facing between-commit activity
surface for Graft.

What shipped:
- bounded `activity_view` over local `artifact_history`
- explicit anchor posture at the current `HEAD` commit when available,
  with explicit `unknown` fallback when not
- grouped recent `read`, `stage`, `transition`, and continuity
  activity around the active causal workspace
- degraded posture carried through instead of flattened away
- human-readable summary/headline text on the bounded activity surface
- thin CLI peer wrapper at `graft diag activity`

What did not ship:
- canonical provenance
- causal-slice / collapse admission
- complete local write-event capture
- GUI / IDE timeline surfaces
- broad search, filter, or paging over all persisted local history

## Playback Witness

Verification witness: [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- Existing debt remains in
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-persisted-local-history-composition.md`
  because persisted local-history storage, event shaping, and summary
  projection are still too coupled.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
