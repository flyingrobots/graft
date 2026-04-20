---
title: "graft_blame silently ignores ambiguous symbol names"
legend: CLEAN_CODE
lane: bad-code
blocked_by:
  - CLEAN_CODE_queries-no-indexed-signal
---

# graft_blame silently ignores ambiguous symbol names

Source: design review exercise 2026-04-19

If two files both export a function called `createUser`, `graft blame createUser` returns the first match without indicating ambiguity. The user has no way to know they're looking at the wrong one.

Desired behavior:
- When a symbol name matches in multiple files, return an `ambiguous` status with the list of matching file paths
- The user narrows with `--path` to get a specific result
- Single-match queries work unchanged

This also affects `graft_log` and `graft_churn` which use the same query infrastructure — `commitsForSymbol` returns results for the first matching symbol without indicating there are others.

Effort: S
