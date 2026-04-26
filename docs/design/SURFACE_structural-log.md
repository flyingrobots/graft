---
title: "graft log — structural git history"
legend: "SURFACE"
cycle: "SURFACE_structural-log"
source_backlog: "docs/method/backlog/up-next/SURFACE_structural-log.md"
---

# graft log — structural git history

Source backlog item: `docs/method/backlog/up-next/SURFACE_structural-log.md`
Legend: SURFACE

## Hill

An agent or human can view the structural history of a codebase
as a per-commit changelog of symbols added, removed, and changed.
This replaces scanning raw diffs to understand what actually
changed in each commit at the code-structure level.

This slice is complete when:

- `graft_log` returns a list of commits with symbol-level
  changes (added, removed, changed) per commit
- Results can be filtered by file path (`--path`)
- Output is capped by a configurable limit (default 20) to
  prevent runaway results on large repos
- Each entry includes commit metadata (SHA, author, date,
  message) plus a human-readable summary line
- Path filter works for both exact file paths and directory
  prefixes

## Playback Questions

### Human

- [ ] Can I see what symbols were added and removed in the
      last 10 commits?
- [ ] Can I filter the log to just changes in a specific file
      or directory?
- [ ] Does the output clearly distinguish added, removed, and
      changed symbols?

### Agent

- [ ] Does `graft_log` return structured JSON with per-commit
      symbol arrays?
- [ ] Does the `limit` parameter cap the number of commits
      queried (not just displayed)?
- [ ] Does the path filter work for directory prefixes (e.g.,
      `src/warp/`) as well as exact file paths?
- [ ] What happens when the WARP index has no data for commits
      in the range — are they shown with empty symbol lists?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - One entry per commit, newest first
  - Summary line gives at-a-glance counts
- Non-visual or alternate-reading expectations:
  - JSON output is self-describing
  - Summary string is readable without formatting

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Dates in ISO 8601 (from git)
  - Author names from git, not localized
- Logical direction / layout assumptions:
  - Commits ordered newest first (git log default)

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - Exact commit SHAs for each entry
  - Complete symbol lists (not sampled)
  - Whether the `limit` was hit (implicit: count entries)
- What must be attributable, evidenced, or governed:
  - Symbol data comes from WARP graph queries
  - Commit metadata comes from git log

## Non-goals

- [ ] Pagination / cursor-based traversal (limit is the only
      cap mechanism)
- [ ] Showing the actual code diff (that's `graft_diff`)
- [ ] Aggregating across commits (that's `graft_churn`)
- [ ] Working without WARP indexing

## Acceptance Criteria

1. `structuralLog(opts)` returns `StructuralLogEntry[]` with
   `sha`, `message`, `author`, `date`, `symbols`, `summary`
2. `symbols` contains `added[]`, `removed[]`, `changed[]` —
   each with `name`, `kind`, `signature?`, `exported`, `filePath`
3. `limit` parameter caps the number of commits (default 20)
4. `path` parameter filters to symbols in that file or
   directory prefix
5. MCP tool `graft_log` exposes `path`, `limit`
   parameters
6. Summary line format: `+N added, ~N changed, -N removed`

## Gap Analysis

Comparing acceptance criteria against `src/operations/structural-log.ts`
and `src/mcp/tools/structural-log.ts`:

- **PASS**: Criteria 1-6 are all implemented as specified
- **GAP: No pagination or "more results available" signal** —
  when the limit is hit, the caller has no way to know there
  are more commits beyond the limit. There is no cursor,
  offset, or `hasMore` flag. For repos with thousands of
  commits this means the agent must guess whether to increase
  the limit. This is acceptable for v1 but worth noting.
- **GAP: Sequential commit processing** — `structuralLog`
  processes commits sequentially with `await` in a for-loop
  rather than batching WARP queries. On 1000 commits this
  would be slow. The default limit of 20 mitigates this, but
  callers can override the limit. Filed as bad-code card.
- **PASS**: Path filter correctly handles both exact paths and
  directory prefixes via `startsWith` check

## Backlog Context

Per-commit structural changelog: symbols added, removed, and changed.

## Surfaces

- **CLI**: `graft struct log [--path PATH]` — formatted terminal output
- **MCP**: `graft_log` tool — JSON structured output

## Core operation

`src/operations/structural-log.ts`:
- Input: optional path filter
- Output: array of `{ sha, author, date, message, symbols: { added, removed, changed } }`
- Uses WARP commit-symbol query helpers

## Depends on

- WARP_commit-symbol-query-helpers
