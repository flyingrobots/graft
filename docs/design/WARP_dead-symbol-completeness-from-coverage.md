---
title: "Dead symbols derive completeness from index coverage"
legend: "WARP"
cycle: "WARP_dead-symbol-completeness-from-coverage"
source_backlog: "ROADMAP.md (branch claude/roadmap-echo), item A4"
---

# Dead symbols derive completeness from index coverage

Roadmap item: A4 on branch `claude/roadmap-echo`. There is no backlog card yet.
Legend: WARP

## Hill

A dead-symbol answer is called complete only when the evidence covers the
domain it declares. When the lazy index has not covered part of that domain,
the answer says `partial` and names the files it is missing. Material the
domain leaves out on purpose is counted, and it does not make the answer
partial.

## Evidence

- `createGitWarpStructuralReadingPort().findDeadSymbols` returns
  `residualPosture: "complete"` unconditionally
  (`src/warp/structural-reading-adapter.ts`).
- Dead symbols are found by diffing `sym:*` nodes in the WARP graph
  (`src/warp/dead-symbols.ts`). Only indexed files have symbol nodes.
- Indexing is lazy and bounded: `indexHead` refuses more than 64 files per
  call and asks for explicit paths or indexing on read
  (`src/warp/index-head.ts`). A repository is usually partly indexed.
- A removal is recorded only when a file is re-indexed. A file indexed at an
  older commit and changed since may hide removals. A file deleted from the
  repository is never re-indexed (`indexHead` takes only tracked paths), so its
  symbols are never recorded as removed.
- `graft_dead_symbols` drops the posture entirely; its output has no
  completeness at all.

## Design

### Domain

The declared domain is `indexable-files-at-basis`: every blob tracked at the
basis commit (`HEAD`) whose language the structural index parses
(`detectLang` is not null). The basis commit is reported with the coverage.

### Excluded versus missing

These are different cases and are reported separately.

- **Excluded** material is outside the domain by declaration. It is counted by
  reason and never makes a reading partial:
  - `unsupported-language`: a tracked file the index does not parse, such as
    `README.md`.
  - `submodule`: a gitlink.
- **Missing** material is inside the domain, or required by it, but not
  covered by the index at the basis commit. Any missing file makes the
  reading `partial`:
  - `not-indexed`: the file has never been indexed.
  - `indexed-content-differs`: the file was indexed at a commit whose blob for
    that path differs from the basis commit's blob. An earlier commit with the
    same blob still counts as covered.
  - `deleted-since-indexed`: the index holds a file the basis commit no longer
    tracks, so its symbols' removal was never recorded.

A file counts as indexed only when its `file:` node carries `indexedCommit`;
import resolution can name file nodes it never indexed.

### Shape

`DeadSymbolsReadingPayload` gains an optional `coverage`
(`StructuralReadingCoverage` in `src/ports/structural-reading.ts`):
`basisCommit`, `domain`, `domainFiles`, `coveredFiles`, `excluded` (by
reason), `missingFiles`, and `missing` (path and reason, sorted by path, at
most 100 named; `missingFiles` is the full count). It is in the payload, so the
generated structural-history model carries it through `payloadJson` without a
schema change.

The git-warp adapter sets `residualPosture` to `complete` exactly when
`missingFiles` is zero, and `partial` otherwise. `graft_dead_symbols` and
`struct_dead_symbols` now return `residualPosture` and `coverage`, and the CLI
renderer prints the completeness and the uncovered files.

### Reference counts

The roadmap groups reference counts with dead symbols. Their primary path, the
committed reference scan, does not read the index: it reads every file at the
ref in a qualified-reference language, and a file that cannot be read fails
the scan instead of being skipped. It already derives `complete` or `partial`
from warnings, unsupported semantics and parse errors. When it fails, the
WARP-graph fallback is already `partial`. So reference counts make no false
`complete` claim today. They do not yet report what they exclude, such as
references from languages outside the scan; that belongs in the shared terms
block (roadmap A5) and is a non-goal here.

## Playback Questions

### Agent

- [ ] With two indexable files and one indexed, does the reading say `partial`
      and name the other file as `not-indexed`?
- [ ] With every indexable file indexed and a README present, is the reading
      `complete`, with the README counted as excluded?
- [ ] After an edit that is not re-indexed, is the edited file missing as
      `indexed-content-differs`, while an unchanged file indexed at the older
      commit stays covered?
- [ ] After a file is deleted, is it reported as `deleted-since-indexed`?
- [ ] Does `graft_dead_symbols` return the posture and the coverage?

### Human

- [ ] Does `graft struct dead-symbols` tell me how much of the repository the
      answer covers, and which files it does not?

## Non-goals

- [ ] Recording removals for deleted files. Indexing does not process paths
      that are no longer tracked; the reading now reports them as missing
      instead of hiding them. Fixing the indexer is
      `docs/method/backlog/bad-code/WARP_index-never-records-deleted-file-symbols.md`.
- [ ] Coverage of history before a file was first indexed. Dead symbols are
      found within the history the index observed; the domain is the current
      tree.
- [ ] Indexing on demand to make a reading complete.
- [ ] Reference-count exclusions and the shared terms block (roadmap A5).
- [ ] The Echo adapter, which is not wired.

## Acceptance Criteria

1. A partly indexed fixture reports `partial` and names the unindexed files.
2. A fully indexed fixture with an excluded file reports `complete` and counts
   the exclusion.
3. Content changed since indexing is `indexed-content-differs`; unchanged
   content indexed earlier is covered.
4. A deleted file the index still holds is `deleted-since-indexed`.
5. `graft_dead_symbols` output carries `residualPosture` and `coverage`, and
   both output schemas accept them.
6. The generated-model round-trip stays loss-free with a coverage report.

## Test Strategy

RED: `test/unit/warp/dead-symbol-coverage.test.ts` builds real repositories,
indexes them with `indexHead` (with and without explicit paths) and reads
through `createGitWarpStructuralReadingPort` with the real git client, plus one
`graft_dead_symbols` call through an in-repo server.
`test/unit/warp/structural-reading-adapter.test.ts` checks that the posture
follows `missingFiles` and ignores `excluded`. On `main` every case that
expects coverage or `partial` fails; the excluded-only case passes on `main`
because `main` always says `complete`, and stays as the guard that exclusions
never degrade completeness.

GREEN: `src/warp/index-coverage.ts` computes the report from `git ls-tree` and
the graph's `file:` nodes; the adapter derives the posture from it; the tool,
schemas and renderer carry it. The renderer test and the generated-model
parity stub gain the new fields.

Validation: the focused files above plus `test/unit/warp/dead-symbols.test.ts`,
`test/unit/cli/dead-symbols-render.test.ts`,
`test/unit/echo/generated-model-parity.test.ts` and
`test/unit/contracts/output-schemas.test.ts` in the isolated runner,
`pnpm typecheck`, `pnpm lint`, `git diff --check`.
