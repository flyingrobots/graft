---
title: "WARP commit-symbol query helpers"
legend: "WARP"
cycle: "WARP_commit-symbol-query-helpers"
source_backlog: "docs/method/backlog/up-next/WARP_commit-symbol-query-helpers.md"
---

# WARP commit-symbol query helpers

Source backlog item: `docs/method/backlog/up-next/WARP_commit-symbol-query-helpers.md`
Legend: WARP

## Hill

An agent or operation can answer two structural questions about
any commit in the WARP graph: "what symbols did this commit
touch?" and "which commits touched this symbol?" These are the
shared traversal primitives that power graft log, graft blame,
and graft churn.

This slice is complete when:

- `symbolsForCommit(warp, sha)` returns added, removed, and
  changed symbols with name, kind, signature, exported flag,
  and file path
- `commitsForSymbol(warp, name, filePath?)` returns the full
  change history for a symbol across all indexed commits
- Symbols that appear in multiple files are distinguished by
  file path; callers can filter with the optional `filePath`
  parameter
- Unindexed commits (no WARP data) return empty results, not
  crashes
- Removals are detected by diffing symbol snapshots at tick
  boundaries, since deleted nodes have no outgoing edges

## Playback Questions

### Human

- [ ] If I ask "what did commit abc123 change?", do I get a
      clear list of added, removed, and changed symbols?
- [ ] If two files define a function named `parse`, can I get
      the history for just one of them by specifying the file?

### Agent

- [ ] Does `symbolsForCommit` return an empty `CommitSymbols`
      (not an error) when the commit has no WARP edges?
- [ ] Does `commitsForSymbol` correctly handle the case where
      the same symbol name appears in multiple files?
- [ ] Does removal detection work correctly when tick is 1
      (first commit — no previous tick to diff against)?
- [ ] Are the query functions free of side effects (pure reads
      against the WARP graph)?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - Results are flat arrays grouped by change kind
  - No nested graph structures exposed to callers
- Non-visual or alternate-reading expectations:
  - All results are typed interfaces, not formatted strings

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Symbol names and file paths are repo-local, not localized
- Logical direction / layout assumptions:
  - `commitsForSymbol` returns commits in graph traversal order
    (not guaranteed chronological — see gap analysis)

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - The change kind (added / removed / changed) for every symbol
  - The file path for every symbol (no ambiguity)
  - Whether the result came from WARP edges or tick-diffing
- What must be attributable, evidenced, or governed:
  - Every result is traceable to specific WARP graph edges
  - Removal detection uses explicit tick-boundary comparison

## Non-goals

- [ ] Providing formatted output (that's the caller's job)
- [ ] Tracking symbol renames across files (WARP Level 2+)
- [ ] Working without WARP indexing (these are graph queries)
- [ ] Ordering commits chronologically (callers sort as needed)

## Acceptance Criteria

1. `symbolsForCommit(warp, sha)` returns `CommitSymbols` with
   `sha`, `added[]`, `removed[]`, `changed[]` — each entry has
   `name`, `kind`, `signature?`, `exported`, `filePath`
2. `commitsForSymbol(warp, name, filePath?)` returns
   `SymbolHistory` with `symbol`, `filePath?`, `commits[]` —
   each commit has `sha`, `changeKind`, `signature?`
3. When `filePath` is provided, only commits touching that
   file's definition of the symbol are returned
4. When `filePath` is omitted and the symbol exists in multiple
   files, all matching commits are returned
5. Unindexed commits return `{ sha, added: [], removed: [],
   changed: [] }`
6. Removal detection compares tick N-1 vs tick N snapshots
7. First commit (tick=1) skips removal detection (no previous
   state to diff)

## Gap Analysis

Comparing acceptance criteria against `src/warp/structural-queries.ts`:

- **PASS**: Criteria 1-3 are implemented as specified
- **PASS**: Criteria 6-7 implemented — `detectRemovals` uses
  tick-boundary diffing and is skipped when `tick <= 1`
- **GAP: No ordering guarantee for `commitsForSymbol`** —
  `commitsForSymbol` returns commits in WARP edge traversal
  order, which is not necessarily chronological. Callers (like
  structural-log) impose their own ordering via `git log`, but
  direct callers of `commitsForSymbol` (like structural-blame)
  may receive unordered results. Filed as bad-code card.
- **GAP: Empty graph returns empty, but no explicit "not indexed"
  signal** — when the WARP graph has no data for a commit,
  `symbolsForCommit` returns empty arrays. This is correct
  behavior, but callers cannot distinguish "commit had no
  structural changes" from "commit was not indexed." Filed as
  bad-code card.

## Backlog Context

Shared query infrastructure for structural history features.

## Queries needed

1. **commits-for-symbol**: given a symbol name (+ optional file path), return all commits that added/removed/changed it, with the change kind and before/after signatures
2. **symbols-for-commit**: given a commit SHA, return all symbols added/removed/changed, grouped by file

Both are reverse traversals over existing WARP edges (`adds`, `removes`, `changes`) using the observer lens system (`commitsLens`, `symbolByNameLens`, `fileSymbolsLens`).

## Location

`src/warp/structural-queries.ts` — pure query functions that accept a `WarpHandle` and return typed results.

## Depends on

WARP Level 1 indexer (shipped v0.4.0).
