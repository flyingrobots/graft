---
title: "Structural test coverage map"
legend: "CORE"
cycle: "CORE_structural-test-coverage-map"
source_backlog: "docs/method/backlog/v0.8.0/CORE_structural-test-coverage-map.md"
---

# Structural test coverage map

Source backlog item: `docs/method/backlog/v0.8.0/CORE_structural-test-coverage-map.md`
Legend: CORE

## Hill

Reviewers can ask Graft for a bounded structural/reference coverage map
over a source directory and a test directory. The map reports exported
symbols that appear in tests and exported symbols with no obvious test
reference, without claiming execution coverage, branch coverage, or
semantic correctness.

This slice is complete when:

- `graft struct test-coverage --src <path> --tests <path>` renders a
  human-readable structural/reference coverage summary
- `--json` returns the same model with schema metadata for agents
- an MCP peer tool exposes the same result model
- the result includes per-file and per-symbol status, reference counts,
  and referencing test files
- output explicitly labels the method as structural/reference coverage
  and includes limitations

Implementation status: shipped in this cycle as
`structuralTestCoverageMap`, MCP tool `graft_test_coverage`, and CLI
command `graft struct test-coverage`.

## Playback Questions

### Human

- [x] Can I see which exported symbols have obvious test references?
- [x] Can I see which exported symbols deserve review attention because
      no structural test reference is visible?
- [x] Is the output explicit that this is not execution coverage?

### Agent

- [x] Does the operation return deterministic JSON grouped by file and
      exported symbol?
- [x] Does the CLI preserve a schema-validated JSON output path?
- [x] Does the MCP peer expose the same model without duplicating
      business logic?
- [x] Does the search stay bounded to the configured test directory?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: summary counts first,
  limitations next, then per-file symbol rows.
- Non-visual or alternate-reading expectations: no color or table
  layout is required to understand covered vs uncovered candidates.

## Localization and Directionality

- Locale / wording / formatting assumptions: English status labels and
  repository-relative paths.
- Logical direction / layout assumptions: files and symbols sort
  lexicographically for deterministic reading.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - `coverageKind` is always `structural_reference`
  - each symbol reports `covered` or `uncovered`
  - each covered symbol includes referencing test files
  - limitations travel with the model
- What must be attributable, evidenced, or governed:
  - source symbols come from parser outlines
  - test references come from bounded text search scoped to test files
  - no instrumentation or test execution is performed

## Non-goals

- [ ] Claim line, branch, statement, or execution coverage.
- [ ] Run test suites.
- [ ] Infer semantic assertions from test bodies.
- [ ] Resolve references through LSP or full WARP reference expansion.
- [ ] Search outside the configured test directory.

## Acceptance Criteria

1. `structuralTestCoverageMap(opts)` reports exported symbols under the
   source directory and groups them by file.
2. Symbols with at least one bounded test-directory reference are
   marked `covered`; symbols with zero references are marked
   `uncovered`.
3. Private/non-exported helper symbols are excluded from the report.
4. CLI command `graft struct test-coverage [--src <path>] [--tests <path>]`
   renders human output by default and schema-validated JSON with
   `--json`.
5. MCP tool `graft_test_coverage` returns the same model.
6. Output includes limitations explaining that the signal is
   reference-based and can include false positives.

## Backlog Context

The v0.8.0 lane is Review Truth. `CORE_pr-review-structural-summary`
answers "what changed structurally?" This card answers "which exported
symbols have obvious structural test references?" It is useful for PR
review because missing references are review attention signals, not
proof of broken behavior.
