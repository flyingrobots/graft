---
title: "Symbol identity and rename continuity"
cycle: "0090-symbol-identity-and-rename-continuity"
design_doc: "docs/design/0090-symbol-identity-and-rename-continuity/symbol-identity-and-rename-continuity.md"
outcome: hill-met
drift_check: yes
---

# Symbol identity and rename continuity Retro

## Summary

This cycle shipped the first real continuity layer above Level 1 symbol
addresses. Structural diff results now preserve plain add/remove truth
and also emit an additive continuity relation when a same-file rename
is likely.

The new continuity surface is intentionally bounded:

- it emits `rename` continuity with explicit `confidence` and `basis`
- it does not collapse old and new `sym:<path>:<name>` addresses into
  fake canonical identity
- it does not claim cross-file or cross-commit canonical symbol IDs

The editor semantic summary now relies on that shared continuity
relation instead of a private rename heuristic.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- [WARP_canonical-symbol-identity-across-files-and-commits](../../backlog/up-next/WARP_canonical-symbol-identity-across-files-and-commits.md)

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
