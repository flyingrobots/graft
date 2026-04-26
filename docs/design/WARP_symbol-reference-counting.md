---
title: "Symbol reference counting"
legend: "WARP"
cycle: "WARP_symbol-reference-counting"
source_backlog: "docs/method/backlog/up-next/WARP_symbol-reference-counting.md"
---

# Symbol reference counting

Source backlog item: `docs/method/backlog/up-next/WARP_symbol-reference-counting.md`
Legend: WARP

## Hill

Any feature that needs to answer "how widely is this symbol
used?" can call a single function and get a count of referencing
files plus the file list. This powers impact analysis in
structural blame and breaking change detection in structural
review.

This slice is complete when:

- `countSymbolReferencesFromGraph(ctx, name, filePath)` returns the reference
  count and list of referencing files
- The search uses WARP graph reference edges, not text search
- Same-name symbols in different files are distinguished by symbol identity
- The definition file is excluded from the count when
  `filePath` is provided
- Files with no references return count 0 and empty list

## Playback Questions

### Human

- [ ] If I ask how many files reference `parse`, do I get an
      accurate count that excludes the file where `parse` is
      defined?
- [ ] Does it work without ripgrep or grep installed?

### Agent

- [ ] Does symbol identity prevent same-name symbols in different
      files from being conflated?
- [ ] Does the function return `{ referenceCount: 0,
      referencingFiles: [] }` when no files reference the
      symbol?
- [ ] Does the function count import and re-export references
      without counting unrelated text matches?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - Single number (count) plus flat list of file paths
  - No nested or hierarchical output
- Non-visual or alternate-reading expectations:
  - Result is a typed interface, not formatted text

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - File paths are repo-relative
- Logical direction / layout assumptions:
  - File list order follows WARP reference edge traversal output

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - The exact count and file list
  - The symbol identity used for the lookup
- What must be attributable, evidenced, or governed:
  - The search method is WARP graph traversal over reference edges

## Non-goals

- [ ] Type-checker-level reference resolution beyond the WARP edges
      emitted by `indexHead`
- [ ] Counting how many times a symbol is referenced within a
      single file (this counts files, not occurrences)
- [ ] Text fallback reference counting
- [ ] Handling cross-language references

## Acceptance Criteria

1. `countSymbolReferencesFromGraph(ctx, name, filePath)` returns
   `ReferenceCountResult` with `symbol`, `referenceCount`,
   `referencingFiles`
2. Uses WARP `references` edges, not ripgrep/grep subprocesses
3. Requires `filePath` to construct the target symbol identity
4. Returns count 0 and empty list when no graph references exist
5. Counts each referencing file once, even with multiple reference edges
6. Counts re-export edges as references

## Gap Analysis

Comparing acceptance criteria against `src/warp/warp-reference-count.ts`:

- **PASS**: Criteria 1-6 are implemented as specified
- **GAP: filePath is required for accurate lookup** — without a
  definition file path, the WARP symbol id cannot be constructed.
  The function returns zero references in that case.

## Backlog Context

Query: "how many files reference symbol X?"

Used by structural blame (show impact) and structural review (breaking change impact analysis).

## Approach

1. Traverse WARP reference edges for the target symbol id
2. Deduplicate references by file path
3. Return: count of referencing files, list of file paths

## Location

`src/warp/warp-reference-count.ts`

## Depends on

code_refs (shipped), WARP Level 1 (shipped).
