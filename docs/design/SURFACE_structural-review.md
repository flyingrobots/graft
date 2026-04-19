---
title: "graft review — zero-noise structural PR review"
legend: "SURFACE"
cycle: "SURFACE_structural-review"
source_backlog: "docs/method/backlog/up-next/SURFACE_structural-review.md"
---

# graft review — zero-noise structural PR review

Source backlog item: `docs/method/backlog/up-next/SURFACE_structural-review.md`
Legend: SURFACE

## Hill

An agent or human reviewing a PR can instantly see which files
contain real structural changes vs formatting noise, test
changes, docs, or config. Breaking changes (removed exports,
changed signatures) are detected automatically with impact
counts showing how many files depend on each broken symbol.

This slice is complete when:

- `graft_review` categorizes every changed file as structural,
  formatting, test, docs, or config
- Files with no symbol-level changes (only whitespace,
  comments, formatting) are labeled "formatting"
- Breaking changes are flagged with the affected symbol,
  change type, and count of impacted files
- The summary gives a one-glance overview of the PR's
  structural weight
- The tool works for any base..head range, defaulting to
  main..HEAD

## Playback Questions

### Human

- [ ] If a PR changes 50 files but only 3 have structural
      changes, does the review clearly surface that?
- [ ] Does the review flag when an exported function's
      signature changes and tell me how many files use it?
- [ ] Can I tell at a glance which files I actually need to
      review carefully?

### Agent

- [ ] Does `graft_review` return structured JSON with
      per-file categories and breaking change details?
- [ ] Does the categorization correctly identify test files
      using common patterns (`.test.`, `.spec.`, `__tests__`)?
- [ ] Does breaking change detection count only exported
      symbol removals, or all symbol removals?
- [ ] How are renamed files handled — as one event or as a
      removal + addition?
- [ ] What happens when binary files appear in the diff?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - Category counts first, then file list, then breaking
    changes — progressive detail
  - Summary string gives the full picture in one line
- Non-visual or alternate-reading expectations:
  - Summary is plain text, no color codes
  - JSON output is fully structured

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - File paths are repo-relative
  - Breaking change descriptions use English labels
- Logical direction / layout assumptions:
  - Files listed in diff-tree order

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - The category for every file (no "unknown" category)
  - The exact count of impacted files per breaking change
  - The change type (removed_export, signature_changed)
- What must be attributable, evidenced, or governed:
  - Structural vs formatting distinction is based on outline
    diffing (symbol-level), not line-level heuristics
  - Impact counts come from ripgrep reference counting

## Non-goals

- [ ] Reviewing the actual code quality (this is structural
      classification, not a linter)
- [ ] Suggesting fixes for breaking changes
- [ ] Handling merge commits or multi-parent diffs
- [ ] Providing line-level diff output (that's `git diff`)

## Acceptance Criteria

1. `structuralReview(opts)` returns `StructuralReviewResult`
   with `base`, `head`, `totalFiles`, `categories`, `files`,
   `breakingChanges`, `summary`
2. Every changed file is categorized as exactly one of:
   `structural`, `formatting`, `test`, `docs`, `config`
3. "Formatting" means the file is in the diff but has zero
   symbol-level changes (no added, removed, or changed symbols)
4. Breaking changes detected for: removed exported symbols,
   exported symbols with changed signatures
5. Each breaking change includes `impactedFiles` count from
   reference counting
6. MCP tool `graft_review` exposes `base` and `head` parameters
7. Summary includes per-category counts and breaking change
   warnings

## Gap Analysis

Comparing acceptance criteria against
`src/operations/structural-review.ts` and
`src/mcp/tools/structural-review.ts`:

- **PASS**: Criteria 1-3, 5-7 implemented as specified
- **GAP: Breaking change detection does not filter by
  `exported` flag** — `detectBreakingChanges` treats ALL
  removed symbols as breaking ("removed_export") and all
  changed symbols with different signatures as breaking,
  regardless of whether they are exported. A private helper
  function being removed is not a breaking change. The
  `DiffEntry` objects in `file.diff.removed` include both
  exported and non-exported symbols. Filed as bad-code card.
- **GAP: Renamed files are not handled** — `git diff-tree
  --name-only` does not detect renames. A renamed file appears
  as one deletion and one addition, which means the old file's
  symbols all show as "removed" (breaking) and the new file's
  symbols all show as "added." This produces false breaking
  change reports. Filed as bad-code card.
- **GAP: Binary files are not filtered** — binary files in the
  diff will be passed to the outline parser, which will either
  produce empty outlines (benign) or potentially error on
  malformed content. The categorization would label them
  "formatting" (no structural changes), which is misleading.
  Not critical but worth noting.

## Backlog Context

Separate structural signal from formatting noise in PRs. Detect breaking changes automatically.

## Surfaces

- **CLI**: `graft review [base] [head]` — formatted terminal output
- **MCP**: `graft_review` tool — JSON structured output

## Core operation

`src/operations/structural-review.ts`:
- Input: base..head ref range
- Output: files categorized (structural/formatting/test), breaking changes flagged, impact per breaking change
- Uses graft_diff (shipped) for structural diff
- Uses symbol reference counting for impact analysis
- Uses export detection for breaking change flagging

## Depends on

- WARP_symbol-reference-counting
- graft_diff (shipped)
