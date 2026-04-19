---
title: "structural-churn path filter matches exact files only, not directories"
legend: CLEAN_CODE
lane: bad-code
---

# structural-churn path filter matches exact files only, not directories

Source: design review exercise 2026-04-19

In `src/operations/structural-churn.ts`, `accumulateSymbols` filters by `sym.filePath !== pathFilter` (exact match). When a user passes a directory path like `src/warp/`, no symbols match because file paths don't end with `/`.

Meanwhile, `listCommitShas` correctly passes the path to `git log -- <path>` which handles directories. This creates a confusing mismatch: commits are found for the directory, but all symbols are filtered out.

Fix: use `startsWith` for directory prefixes (matching the pattern in `structural-log.ts`'s `filterByPath`).

Affected files:
- `src/operations/structural-churn.ts` line 107

Effort: S
