---
title: "Cycle 0044 — code_find substring search Retro"
---

# Cycle 0044 — code_find substring search Retro

Design: `docs/design/0044-code-find-substring-search/code-find-substring-search.md`
Outcome: Met: code_find now supports case-insensitive approximate discovery for plain-text queries while preserving explicit glob behavior, with live and WARP witnesses and updated operator docs.
Drift check: yes

## Summary

- plain-text `code_find` queries now do case-insensitive approximate
  discovery with deterministic exact/prefix/substring ranking
- explicit glob queries such as `handle*` keep the existing glob
  behavior
- added live and WARP witnesses for substring discovery and updated
  README / GUIDE / CHANGELOG language to reflect the new operator
  expectation

## Playback Witness

- `docs/method/retro/0044-code-find-substring-search/witness/verification.md`

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [ ] Dead work buried or merged
