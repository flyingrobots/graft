---
title: "Structural churn report"
legend: "WARP"
cycle: "WARP_structural-churn-report"
source_backlog: "docs/method/backlog/up-next/WARP_structural-churn-report.md"
---

# Structural churn report

Source backlog item: `docs/method/backlog/up-next/WARP_structural-churn-report.md`
Legend: WARP

## Hill

An agent or human can identify maintenance hotspots by seeing
which symbols change most frequently across the full commit
history. High-churn symbols indicate unstable abstractions,
tight coupling, or design debt.

This slice is complete when:

- `graft_churn` returns a ranked list of symbols by change
  frequency
- Each entry shows the symbol name, file, kind, change count,
  and last-changed commit
- Results can be filtered by path and limited in count
- The report walks all indexed commits and counts per-symbol
  changes (adds, removes, and modifications all count)
- The summary gives the total symbol count, commit count, and
  the hottest symbol

## Playback Questions

### Human

- [ ] Can I see which functions in my codebase change the most?
- [ ] Can I filter churn to a specific directory to find
      hotspots in one area?
- [ ] Does a symbol that changed 10 times show count 10?

### Agent

- [ ] Does `graft_churn` distinguish "changed 10 times in 10
      commits" from "changed 10 times in 1 commit"?
- [ ] What is the performance on repos with 10K+ commits —
      does it process every commit sequentially?
- [ ] Does the path filter match exact files, directory
      prefixes, or both?
- [ ] Are additions and removals counted as changes, or only
      modifications?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - Ranked list, highest churn first
  - Summary line gives the single most important fact
- Non-visual or alternate-reading expectations:
  - JSON output is a flat array of entries
  - Summary is plain text

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Dates in ISO 8601
  - File paths repo-relative
- Logical direction / layout assumptions:
  - Entries sorted by changeCount descending

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - Exact change count per symbol
  - The commit SHA and date of the last change
  - Total commits analyzed (to gauge coverage)
- What must be attributable, evidenced, or governed:
  - Every change count is traceable to specific commits via
    the WARP query function

## Non-goals

- [ ] Showing the actual changes per commit (that's
      `graft_log`)
- [ ] Churn by file or directory (this is symbol-level)
- [ ] Time-windowed churn analysis (e.g., "churn in last 30
      days")
- [ ] Suggesting refactoring actions

## Acceptance Criteria

1. `structuralChurnFromGraph(ctx, options?)` returns `StructuralChurnResult`
   with `entries[]`, `totalSymbols`, `totalCommitsAnalyzed`,
   `summary`
2. Each `ChurnEntry` has `symbol`, `filePath`, `kind`,
   `changeCount`, `lastChangedSha`, `lastChangedDate`
3. `limit` parameter caps the output list (default 20)
4. `path` parameter filters to symbols in that file
5. Adds, removes, AND changes all increment the change count
6. Entries are sorted by `changeCount` descending
7. MCP tool `graft_churn` exposes `path` and `limit`
8. Summary format: "N symbols across M commits. Hottest: X
   (Y changes)."

## Gap Analysis

Comparing acceptance criteria against
`src/warp/warp-structural-churn.ts` and
`src/mcp/tools/structural-churn.ts`:

- **PASS**: Criteria 1-8 implemented as specified
- **PASS**: Path filter handles exact files and directory prefixes through
  `startsWith`.
- **GAP: Does NOT distinguish per-commit vs per-symbol
  changes** — if a symbol changes once in each of 10 commits,
  it gets count 10. If a symbol appears in all three arrays
  (added, removed, changed) in a single commit (unlikely but
  possible with re-processing), it could count as 3. The
  current design counts each array entry independently. This
  is acceptable but should be documented.
- **PASS**: Live-symbol change counts use `QueryBuilder.aggregate()`
  over WARP commit nodes. Tombstoned symbols fall back to tick receipt
  evidence because deleted `sym:*` nodes are no longer live query seeds.

## Backlog Context

Which symbols change most frequently? High-churn symbols are
maintenance hotspots. Count `changes` edges per symbol across
the worldline.

## Surfaces

- **CLI**: `graft churn [--path PATH] [--limit N]`
- **MCP**: `graft_churn` tool

## Core operation

`src/warp/warp-structural-churn.ts`:
- Input: optional path filter, limit
- Output: ranked list of symbols by change frequency, with files and last-changed commit

## Depends on

- WARP_commit-symbol-query-helpers
