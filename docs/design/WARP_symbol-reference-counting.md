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

- `countSymbolReferences(name, opts)` returns the reference
  count and list of referencing files
- The search uses ripgrep with grep fallback (works on any
  system)
- Word-boundary matching (`-w`) prevents `User` from matching
  `UserService` in most cases
- The definition file is excluded from the count when
  `filePath` is provided
- Files with no references return count 0 and empty list

## Playback Questions

### Human

- [ ] If I ask how many files reference `parse`, do I get an
      accurate count that excludes the file where `parse` is
      defined?
- [ ] Does it work on a machine without ripgrep installed?

### Agent

- [ ] Does word-boundary matching (`-w`) correctly prevent
      `User` from matching inside `UserService`?
- [ ] Does the function return `{ referenceCount: 0,
      referencingFiles: [] }` when no files reference the
      symbol?
- [ ] Does the ripgrep-to-grep fallback activate correctly
      when ripgrep is not installed?
- [ ] Does the function handle symbols with regex-special
      characters in their names?

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
  - File list order is determined by ripgrep/grep output order

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - The exact count and file list
  - Whether the definition file was excluded
- What must be attributable, evidenced, or governed:
  - The search method (ripgrep vs grep) is implicit — callers
    cannot tell which was used (see gap analysis)

## Non-goals

- [ ] Semantic reference resolution (this is text search, not
      a type checker)
- [ ] Counting how many times a symbol is referenced within a
      single file (this counts files, not occurrences)
- [ ] Using WARP graph edges for reference counting (the
      backlog mentioned this but the implementation uses
      ripgrep/grep only)
- [ ] Handling cross-language references

## Acceptance Criteria

1. `countSymbolReferences(name, opts)` returns
   `ReferenceCountResult` with `symbol`, `referenceCount`,
   `referencingFiles`
2. Uses ripgrep with `-w` (word-boundary) matching
3. Falls back to grep with `-w` when ripgrep is unavailable
4. Excludes the definition file when `opts.filePath` is
   provided
5. Returns count 0 and empty list when no files match
6. Searches all tracked and untracked (non-ignored) files
7. Throws with a clear error when both ripgrep and grep fail

## Gap Analysis

Comparing acceptance criteria against `src/warp/reference-count.ts`:

- **PASS**: Criteria 1-7 are all implemented as specified
- **GAP: Word-boundary matching has known false-positive edge
  cases** — ripgrep `-w` uses `\b` word boundaries, which
  means `get` will match inside `target` if `get` appears at
  a word boundary elsewhere on the same line. More importantly,
  `-w` will match `User` inside `User_legacy` or `User2` since
  `_` and digits can be word-boundary adjacent depending on
  locale. This is a known limitation of text-based search vs
  semantic analysis. The grep fallback uses `-w -F` (fixed
  string + word boundary) which has the same behavior.
- **GAP: No search method attribution** — callers cannot
  determine whether the result came from ripgrep or grep.
  For explainability, the result should include which tool
  was used. Filed as bad-code card.
- **GAP: Large file lists may hit OS argument limits** — the
  function passes ALL tracked file paths as arguments to
  ripgrep/grep. On repos with tens of thousands of files,
  this could exceed `ARG_MAX`. Filed as bad-code card.

## Backlog Context

Query: "how many files reference symbol X?"

Used by structural blame (show impact) and structural review (breaking change impact analysis).

## Approach

1. First try WARP edges if available (fastest, indexed)
2. Fall back to `code_refs` infrastructure (ripgrep text search)
3. Return: count of referencing files, list of file paths

## Location

`src/warp/reference-count.ts` or extend existing `src/mcp/tools/precision.ts` infrastructure.

## Depends on

code_refs (shipped), WARP Level 1 (shipped).
