---
title: "structural-churn walks all commits with no limit or parallelism"
legend: CLEAN_CODE
lane: graveyard
superseded: true
superseded_reason: "Superseded: structural-churn will be rewritten to use WARP aggregate queries (no commit walking)"
---

# structural-churn walks all commits with no limit or parallelism

Source: design review exercise 2026-04-19

`structuralChurn` in `src/operations/structural-churn.ts` has two performance concerns:

1. `listCommitShas` calls `git log --reverse` with no `--max-count`, retrieving ALL commit SHAs in the repo history. On a repo with 10K+ commits this is slow and memory-intensive.

2. The main loop processes commits sequentially (`for...of` with `await`), calling `querySymbolsForCommit` for each. No batching, no parallelism, no progress indication.

The `limit` parameter only caps the output list, not the number of commits analyzed. A user requesting the top 5 churn symbols still processes every commit.

Fix options:
- Add a `--max-commits` parameter to cap the walk
- Batch WARP queries for parallelism
- Consider caching churn data across sessions

Affected files:
- `src/operations/structural-churn.ts` lines 66-91 and 129-158

Effort: M
