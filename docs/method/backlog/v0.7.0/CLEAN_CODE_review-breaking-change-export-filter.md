---
title: "structural-review flags non-exported symbols as breaking changes"
legend: CLEAN_CODE
lane: v0.7.0
---

# structural-review flags non-exported symbols as breaking changes

Source: design review exercise 2026-04-19

`detectBreakingChanges` in `src/operations/structural-review.ts` treats ALL removed symbols as "removed_export" and all changed symbols with different signatures as breaking, regardless of whether they have the `exported` flag set. Removing a private helper function or changing an internal signature triggers a false breaking change warning.

This directly undermines the zero-noise review promise. A 50-file PR where someone renames an internal helper would show a spurious breaking change warning.

Fix: filter `file.diff.removed` and `file.diff.changed` to only include entries where the symbol was exported before applying breaking change logic.

Affected files:
- `src/operations/structural-review.ts` lines 113-154

Effort: S
