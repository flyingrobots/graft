---
title: "Outline diff in commit trailers"
legend: WARP
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "graft diff (shipped)"
  - "Outline extraction (shipped)"
acceptance_criteria:
  - "A post-commit hook appends a Structural-Diff trailer to the commit message"
  - "The trailer lists added, removed, and changed symbols with their kind (function, class, etc.)"
  - "Agents can parse the trailer from git log output without reading the actual diff"
  - "The trailer format is machine-readable and documented"
---

# Outline diff in commit trailers

Post-commit hook appends a structural summary to the commit message
as a trailer:

```
Structural-Diff: added createGraftServer; changed SessionTracker.getMessageCount (new)
```

Machine-readable metadata that agents can consume from `git log`
without reading the actual diff. Pairs naturally with `graft diff`
(same structural diff primitive, different output target).

Depends on: graft diff.

## Implementation path

1. Extract the structural diff for the just-committed changes:
   run `graft diff` (or its internal equivalent) comparing HEAD~1
   to HEAD to get the list of added, removed, and changed symbols
   with their kinds.
2. Format as a Git trailer: `Structural-Diff: added fn:X; removed
   class:Y; changed fn:Z`. Define a compact, parseable syntax.
   Document the format so agents and tools can consume it reliably.
3. Implement as a `post-commit` hook (or a `prepare-commit-msg`
   hook that pre-computes the trailer before the commit is
   finalized — `post-commit` requires amending, which conflicts
   with the repo's no-amend policy). A `prepare-commit-msg` hook
   is more appropriate: it appends the trailer to the message
   before the commit is created.
4. Handle edge cases: commits that only change non-code files
   (no structural diff), merge commits (diff against first parent),
   and commits with many changed symbols (truncate or summarize
   beyond a threshold).
5. Add a parser utility: a function that extracts structured data
   from the trailer in `git log` output. This is the agent-facing
   API — agents call `git log --format=%(trailers)` and parse the
   result.

## Related cards

- **WARP_symbol-history-timeline**: Timeline shows how a symbol
  evolved across commits. Commit trailers would provide a fast
  index for timeline queries (scan trailers instead of re-running
  graft diff for each commit). Complementary optimization, not
  a hard dep.
- **WARP_auto-breaking-change-detection**: Breaking change
  detection could consume trailers to quickly identify commits
  that removed or changed exported symbols. But breaking change
  detection needs semantic analysis (signature compatibility, not
  just presence/absence), so trailers are a screening filter, not
  a replacement. Not a hard dep.
- **WARP_structural-drift-detection**: Drift detection compares
  docs against code. Trailers provide a per-commit structural
  changelog that drift detection could cross-reference. Useful
  input but not required. Not a hard dep.
- **CORE_git-graft-enhance**: The `git graft enhance` command
  enriches git output with structural data. Trailers are a
  complementary enrichment mechanism (embedded in git data vs.
  overlaid at query time). Independent.

## No dependency edges

All prerequisites are shipped (WARP Level 1, graft diff, outline
extraction). No other card must ship first. No other card is
blocked waiting for commit trailers. The related cards above
could benefit from trailers as an optimization but none require
them.

## Effort rationale

Small. The structural diff computation already exists in
`graft diff`. The work is: (a) formatting the diff as a Git
trailer, (b) implementing the hook (prepare-commit-msg or
post-commit), and (c) documenting the trailer format. Edge case
handling (merge commits, large diffs) adds some complexity but
the core path is a thin wrapper around existing infrastructure.
S, not M, because no new algorithms or storage are needed — just
plumbing from an existing tool to a new output target.
