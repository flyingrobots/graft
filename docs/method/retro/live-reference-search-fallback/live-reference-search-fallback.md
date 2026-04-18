---
title: "live reference search fallback Retro"
---

# live reference search fallback Retro

Design: `docs/design/0045-live-reference-search-fallback/live-reference-search-fallback.md`
Outcome: Met: shipped MCP tool `code_refs` as an explicit text-fallback reference-search surface for import sites, callsites, property access, and scoped workspace text references, with provenance, contracts, tests, docs, and follow-on debt capture.
Drift check: yes

## Summary

- shipped new MCP-only tool `code_refs` for import-site, callsite,
  property-access, and literal text reference search across the working
  tree
- made the fallback explicit in the contract with `source:
  "text_fallback"` plus engine, pattern, and scope provenance
- added regression coverage for import, call, property, scoped-package,
  and `.graftignore` denial behavior
- updated README / GUIDE / VISION tool listings so the new surface is
  part of the documented product
- captured follow-on debt for the new tool's orchestration seam and
  extended the existing sync child-process debt note to include
  `code_refs`

## Playback Witness

- `docs/method/retro/0045-live-reference-search-fallback/witness/verification.md`

## Drift

- None recorded.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-refs.md`
- updated `docs/method/backlog/bad-code/CLEAN_CODE_sync-child-process-request-path.md`

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
