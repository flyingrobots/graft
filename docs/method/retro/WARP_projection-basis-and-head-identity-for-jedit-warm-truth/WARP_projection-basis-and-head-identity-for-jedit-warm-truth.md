---
title: "Projection basis and head identity for jedit warm truth"
cycle: "WARP_projection-basis-and-head-identity-for-jedit-warm-truth"
design_doc: "docs/design/WARP_projection-basis-and-head-identity-for-jedit-warm-truth.md"
outcome: hill-met
drift_check: yes
---

# Projection basis and head identity for jedit warm truth Retro

## Summary

This slice made Graft's direct dirty-buffer surface basis-aware. A host
can now pass explicit editor head/tick identity into
`createStructuredBuffer(...)`, read that basis back from single-buffer
projection results, and see explicit `fromBasis` / `toBasis` on
snapshot-to-snapshot operations. Unsupported-language and partial-parse
results remain explicit while carrying truthful basis metadata.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0084-projection-basis-and-head-identity-for-jedit-warm-truth/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
