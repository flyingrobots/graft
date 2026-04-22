---
title: "Structural test coverage map"
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "graft_map structural mapping (shipped)"
  - "file_outline symbol extraction (shipped)"
  - "code_refs reference search (shipped)"
acceptance_criteria:
  - "Given src/ and test/ directories, the tool reports which exported symbols have test references and which do not"
  - "Output explicitly labels coverage as structural/reference-based, not execution-based"
  - "Symbols with zero test references are flagged as uncovered candidates"
  - "The tool uses existing map/outline/search primitives without requiring instrumentation"
  - "False positive rate acknowledged: structural reference does not guarantee execution coverage"
---

# Structural test coverage map

Cross-reference the structural map of `src/` and `test/` to answer:
- which exported symbols appear to have direct test coverage
- which major symbols have no obvious test references

Prompted by external dogfood feedback:
- "cross-reference graft_map of src against graft_map of test"

## Implementation path

1. `graft_map` on `src/` to enumerate all source files
2. `file_outline` on each source file to extract exported symbols
3. For each exported symbol, `code_refs` scoped to `test/` to
   check if any test file references it
4. Classify: covered (has test refs) vs uncovered (zero refs)
5. Report with per-file and per-symbol breakdown

Uses `code_refs` (grep-based) for the cross-reference step.
Could later benefit from WARP `references` edges (faster, no
subprocess), but has no hard dependency on the rewrite — the
card intentionally uses existing shipped primitives.

## Constraints

- Cannot claim true line or branch coverage — this is
  structural/reference coverage, not execution coverage
- A test that imports a symbol but never calls it will count as
  "covered" — false positives are inherent
- First versions should be explicit about these limitations in
  output

## Related cards

- **CORE_pr-review-structural-summary**: Both are review helpers.
  PR summary shows what changed structurally; coverage map shows
  what's tested. Independent — could be combined in review
  workflows but neither requires the other.
- **CORE_rewrite-structural-review** (active cycle): Also counts
  references, but for a single symbol's reference count, not a
  sweep across all exports.

## Effort rationale

Medium. The orchestration is non-trivial: enumerate exports across
potentially hundreds of files, cross-reference each against test/,
handle edge cases (re-exports, barrel files, test helpers that
aren't themselves tests). Reporting format needs design.
