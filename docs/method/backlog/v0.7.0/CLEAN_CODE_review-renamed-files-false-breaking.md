---
title: "structural-review produces false breaking changes on renamed files"
legend: CLEAN_CODE
lane: v0.7.0
---

# structural-review produces false breaking changes on renamed files

Source: design review exercise 2026-04-19

`structuralReview` uses `git diff-tree --name-only` which does not detect renames. A renamed file appears as a deletion (old path) plus an addition (new path). This means every symbol in the renamed file shows as "removed" at the old path and "added" at the new path, generating spurious breaking change warnings.

Fix: use `git diff-tree -M` (rename detection) and pair up old/new paths so that renames are treated as a single event with no breaking changes unless the symbol actually changed.

Affected files:
- `src/operations/structural-review.ts` lines 240-250

Effort: M
