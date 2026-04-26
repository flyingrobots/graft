---
title: git graft enhance provenance hints
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
requirements:
  - git graft enhance --since first slice
  - provenance-backed structural blame (shipped)
acceptance_criteria:
  - "Enhance output includes bounded provenance hints for changed symbols"
  - "Hints use graft_blame or equivalent provenance-backed structural blame data"
  - "Ambiguous symbols are reported explicitly instead of guessed"
  - "The command remains bounded and does not fan out across unbounded symbol sets"
blocked_by:
  - CORE_git-graft-enhance
---

# git graft enhance provenance hints

After the first `git graft enhance --since` slice exists, enrich the
review summary with bounded symbol-level provenance hints.

Useful hints could include:

- creation commit for changed symbols
- last signature-change commit
- reference count
- whether blame was unavailable because the symbol is not indexed
- whether a symbol name was ambiguous across files

This is intentionally not part of the first v0.7.0 enhance slice. It
adds per-symbol fanout and ambiguity behavior that should be designed
after the base enhance model and renderer are stable.

## Non-goals

- No arbitrary Git command wrapping.
- No LSP enrichment.
- No reference expansion through `code_find`.
- No unbounded per-symbol traversal.
