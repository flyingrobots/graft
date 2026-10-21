---
title: "Dead-symbol completeness from coverage retro"
cycle: WARP_dead-symbol-completeness-from-coverage
design_doc: docs/design/WARP_dead-symbol-completeness-from-coverage.md
outcome: implementation-validated
drift_check: yes
---

# Dead-symbol completeness from coverage retro

## What shipped

A dead-symbol answer states what it covers instead of always saying
`complete`.

- **Current-tree coverage.** The reading is checked against a declared
  domain, the indexable files tracked at `HEAD`
  (`src/warp/index-coverage.ts`). Excluded material (unsupported languages,
  submodules) is counted by reason and never makes the answer partial.
  Domain files that are `not-indexed`, `indexed-content-differs` or
  `deleted-since-indexed` make it `partial` and are named, up to 100 with the
  full count. The field is `currentTreeCoverage`.
- **History terms.** Dead symbols are derived from symbol sets observed at
  indexed commit boundaries, so the reading carries
  `history: {domain: "observed-index-history", indexedBoundaries,
  examinedBoundaries, earliestExamined, latestExamined, limitedByMaxCommits,
  unobserved: ["changes-between-boundaries", "history-before-earliest-boundary"]}`.
  It is `null` when a substrate cannot state it, so unknown stays unknown.
- **Removal boundaries.** `removedInCommit` is replaced by
  `lastObservedPresentAt` and `firstObservedAbsentAt` in the port, domain,
  Echo fakes, generated-model validator, output and CLI renderer.
- **Honest fallback basis.** A reference reading that falls back to the
  lazily built WARP graph reports `freshness: "incomparable"` and a
  `warp-indexed-graph` basis that records `requestedRef` without claiming it.
- `graft_dead_symbols` and `struct_dead_symbols` advance to schema `2.0.0`.

## Playback

### Agent

- [x] Two indexable files with one indexed: `partial`, and the other file is
      named `not-indexed`.
- [x] Every indexable file indexed plus a README: `complete`, with the README
      counted as excluded.
- [x] After an edit that is not re-indexed, the edited file is missing as
      `indexed-content-differs`; an unchanged file indexed at an older commit
      stays covered.
- [x] A deleted file is reported as `deleted-since-indexed`.
- [x] `graft_dead_symbols` returns the posture and the coverage.
- [x] A dead symbol names the boundaries between which it was removed. On
      `98111ef0` it named a later indexed commit as `removedInCommit`.
- [x] The answer states that changes between observations are unobserved.
- [x] `maxCommits` shows up as `limitedByMaxCommits` with a narrowed examined
      history.
- [x] A fallback reference reading does not claim the requested ref.

### Human

- [x] `graft struct dead-symbols` prints the posture, the coverage counts and
      the missing files, and the history it examined.

## What the cycle got wrong first

The first GREEN (`98111ef0`) made completeness honest about today's files
and stopped there. The external review ruled that coverage of today's files
is not coverage of their history: a symbol added and removed between two
indexed commits is invisible, and `removedInCommit` presented the first
absent boundary as the removing commit. The RED at `8c205cb1` proved it with a
symbol removed at an unindexed commit. The same review found the adapter's
fallback claimed `freshness: "current"` at a ref it did not read. The packet
was amended (`332ea197`) before the second GREEN.

## Verification

- Full suite in the isolated Docker runner at `81616505`: 280 files, 2625
  tests passed. See the PR body for the run on the PR head.
- `tsc --noEmit`, `eslint .`, `git diff --check`: clean.

## Drift

- The generated structural-history schema has no basis kind for the WARP
  indexed graph, so the fallback maps to `UNPINNED_COMMITTED` with no ref.
  Dead-symbol readings still use the `git-committed-history` basis kind.
  Whether a dedicated kind is needed is left to A5.
- The packet cites roadmap item A4 on the unmerged planning branch
  `claude/roadmap-echo`.

## Follow-up

- `docs/method/backlog/bad-code/WARP_index-never-records-deleted-file-symbols.md`:
  a deleted file's symbols are never removed from the index, so the answer
  stays `partial` until indexing reconciles deletions.
- `docs/method/backlog/up-next/CORE_reference-counts-state-their-terms.md`
  (A4b): reference counts state their unit and actual basis. No automatic
  A4 to A4b edge is recorded.
- `docs/method/backlog/up-next/CORE_shared-answer-terms.md` (A5): shared
  answer terms across readings, `blocked_by` A4b.
