---
title: "code_find confidential prefilter retro"
cycle: CORE_code-find-confidential-prefilter
design_doc: docs/design/CORE_code-find-confidential-prefilter.md
outcome: implementation-validated
drift_check: yes
---

# code_find confidential prefilter retro

## What shipped

A `code_find` answer no longer depends on what a confidential file contains,
or on whether it exists.

- Live path: confidential files are removed from the candidate list before
  `searchLiveSymbols` parses anything.
- WARP path: matches whose path is confidential are dropped before any file is
  loaded or any policy chooses a refusal.
- Confidentiality is decided by name with `isConfidentialPath`
  (`src/policy/confidential.ts`), independently of the ban a refusal would
  display, so `dist/credentials.js`, refused as `BUILD_OUTPUT`, is still
  confidential. The module is byte-identical to the one the `code_refs`
  change introduces, so the two changes share one classifier.
- Relevance bans are unchanged, and the output shape is unchanged:
  `graft.mcp.code_find` stays at `2.0.0`.

## Playback

### Agent

- [x] With no visible match, repositories differing only in whether
      `credentials.ts` defines the queried symbol answer identically. On
      `main` one answered with a refusal naming `credentials.ts` and its size,
      the other with zero matches.
- [x] Beside a visible match, they answer identically.
- [x] `dist/credentials.js` is kept out although it displays as
      `BUILD_OUTPUT`.
- [x] After `HEAD` is indexed, the WARP path answers identically. It leaked
      the same way on `main`.
- [x] The answer does not reveal whether a confidential file exists (an
      existence pair is compared).

### Human

- [x] `code_find` no longer confirms guesses about a secret file's symbol
      names, within the fixtures tested.

## What the cycle got wrong first

The first version of the paired test passed vacuously. A `code_find` lazily
indexes the files of its visible matches, which records a `HEAD` boundary,
and every later `code_find` in the session answers from that partial index.
The warm-up probe `code_find createSurface` therefore made the later
`code_find rotateApiToken` answer zero matches on both sides of every pair,
although `src/token.ts` defines `rotateApiToken`. The probes were reordered
and a positive control added, so the test now proves the visible definition
is found. The underlying defect is pre-existing and filed separately.

## Verification

- RED at `33363afb` on the code from `main`: the no-visible-match pairs
  differ on the live and WARP paths.
- Full suite in the isolated Docker runner: see the PR body for the run on
  the PR head.
- `tsc --noEmit`, `eslint .`, `git diff --check`: clean.
- The pairs are finite fixtures; they do not prove universal
  noninterference and do not cover timing.

## Drift

- Confidential files can still enter the WARP index; this change filters
  what `code_find` returns, not what is indexed. That is a stated non-goal
  and is on the audit card.
- `code_find` does not state the content-denial rule in its answer, as
  `code_refs` does with `contentDenial`. That belongs to the shared answer
  terms (A5) and would need a schema change.

## Follow-up

- Filed `docs/method/backlog/bad-code/CORE_code-find-answers-from-partial-lazy-index.md`:
  after lazy indexing, `code_find` answers from a partial WARP index and
  misses symbols in unindexed files, with no coverage signal.
- The remaining confidential surfaces (read refusal sizes, indexing, maps,
  dead symbols, reference counts, coverage path names) stay on
  `CORE_confidential-content-surface-audit`, filed by the `code_refs` change.
