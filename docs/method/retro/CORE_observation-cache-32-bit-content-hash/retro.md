---
title: "Observation cache content identity retro"
cycle: CORE_observation-cache-32-bit-content-hash
design_doc: docs/design/CORE_observation-cache-32-bit-content-hash.md
outcome: implementation-validated
drift_check: yes
---

# Observation cache content identity retro

## What shipped

The observation cache identifies content by SHA-256 instead of 32-bit FNV-1a.

- `hashContent` in `src/operations/observation-cache.ts` returns
  `sha256:<hex>` over the content's UTF-8 bytes. On the strict,
  BOM-preserving read path this is the SHA-256 of the observed bytes.
- Content with a lone surrogate has no faithful UTF-8 encoding, so it is
  hashed as UTF-16LE code units under `sha256-utf16le:`. The two labels keep
  the domains disjoint.
- The pure SHA-256 that `src/contracts/review-digest.ts` already carried moved
  to `src/contracts/sha256.ts` as `sha256Hex`, and both callers use it.
  Application modules may not import `node:crypto`.
- Identities recorded before this change are 8-digit hex strings. They never
  equal a labelled digest, so old entries are reparsed, never suppressed.

## Playback

### Agent

- [x] After a colliding edit, `safe_read` answers with a `diff` projection
      against the prior observation, not `REREAD_UNCHANGED`. Failed on `main`.
- [x] After a colliding edit, `file_outline` reparses instead of returning
      `cacheHit: true`. Failed on `main`.
- [x] An unchanged reread still hits the cache. Passed on `main`; kept as a
      guard for the new encoding.

### Human

- [x] The collision reproduces on `main` and is fixed here with one test
      file, `test/unit/operations/observation-cache.test.ts`, using the pair
      `export const limit = 33149;` and `export const limit = 908276;`.

## What the cycle got wrong first

The first RED workspace cases read `limit.ts` while the in-memory filesystem
held `/repo/limit.ts`. They failed on `NOT_FOUND` before they reached the
cache, so they were red for the wrong reason. `de77accd` resolves request
paths under `/repo`, as the repo-local server does. After that they failed on
`main` for the right reason: the cache reported a hit.

The RED `safe_read` case expected a changed reread to return the full
`content` projection. A changed reread of a file with a prior observation is
answered with a `diff` against it. The GREEN commit corrected the expectation
to the `diff` projection and kept the assertion that matters: the answer is
never `REREAD_UNCHANGED`.

## Verification

- Full suite in the isolated Docker runner (`scripts/run-isolated-tests.ts`)
  at `b554a896`: 279 files, 2619 tests passed.
- `tsc --noEmit`: clean. `eslint .`: clean. `git diff --check`: clean.
- `hashContent` is checked against `node:crypto` SHA-256 of the UTF-8 bytes
  for empty, ASCII, BOM, astral and 70,000-character samples.

## Drift

- The design packet names a source card,
  `bad-code/CORE_observation-cache-32-bit-content-hash.md`, that was never
  committed to `main`. The packet is the record of the problem; no card is
  added after the fact.
- The packet points at roadmap item A1 on the unmerged planning branch
  `claude/roadmap-echo`. That reference is to a proposal, not to adopted
  direction.

## Follow-up

- Reread suppression still trusts a cache hit as delivery. That is roadmap
  item A2 (`CORE_reread-suppression-trusts-cache-as-delivery`), which this
  change unblocks: its delivery ledger uses the same SHA-256 of the observed
  bytes.
- No new debt was found.
