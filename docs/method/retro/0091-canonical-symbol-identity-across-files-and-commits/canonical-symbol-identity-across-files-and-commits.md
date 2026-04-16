---
title: "Canonical symbol identity across files and commits"
cycle: "0091-canonical-symbol-identity-across-files-and-commits"
design_doc: "docs/design/0091-canonical-symbol-identity-across-files-and-commits/canonical-symbol-identity-across-files-and-commits.md"
outcome: hill-met
drift_check: yes
---

# Canonical symbol identity across files and commits Retro

## Summary

`0091` shipped canonical `sid:*` identity as a WARP concern instead of
leaving identity at address-level `sym:<path>:<name>` plus continuity hints.
The indexer now carries canonical identity across same-file renames and
git-reported file moves, and indexed precision reads can surface that
identity directly.

## Playback Witness

- [verification.md](./witness/verification.md)

## Drift

- None recorded.

## New Debt

- [WARP_canonical-symbol-identity-projection-across-structural-diff-and-since-surfaces.md](/Users/james/git/graft/docs/method/backlog/up-next/WARP_canonical-symbol-identity-projection-across-structural-diff-and-since-surfaces.md:1)

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
