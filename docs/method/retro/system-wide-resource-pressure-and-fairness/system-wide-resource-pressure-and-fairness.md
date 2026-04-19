---
title: "System-wide resource pressure and fairness"
cycle: "0058-system-wide-resource-pressure-and-fairness"
design_doc: "docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md"
outcome: hill-met
drift_check: yes
---

# System-wide resource pressure and fairness Retro

## Summary

`0058` landed the daemon execution substrate needed for fair multi-
session work:

- async `GitClient` via `@git-stunts/plumbing`
- async daemon-heavy request-path filesystem reads
- daemon job scheduler
- child-process worker pool
- background monitors routed through the scheduler
- logical WARP writer lanes keyed by stable writer identity

The hill was met as an execution-substrate packet. During the cycle, the
repo direction also sharpened: full strand-aware causal collapse is a
follow-on WARP ontology problem and is currently blocked on upstream
`git-warp v17.1.0+` support. That sharpened the next cycle rather than
invalidating the substrate work.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0058-system-wide-resource-pressure-and-fairness/witness/verification.md)

## Drift

- None recorded.

## New Debt

- METHOD drift originally could not see this repo's test witnesses
  because it scans `tests/**` while the historical suite lived under
  `test/**`. This cycle now carries a real playback witness slice under
  `tests/playback/` and Vitest includes both roots.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed
- [ ] Priorities reviewed
- [ ] Dead work buried or merged
