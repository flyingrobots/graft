---
title: "Observation cache identifies content by SHA-256"
legend: "CORE"
cycle: "CORE_observation-cache-32-bit-content-hash"
source_backlog: "docs/method/backlog/bad-code/CORE_observation-cache-32-bit-content-hash.md"
---

# Observation cache identifies content by SHA-256

Source backlog item: `CORE_observation-cache-32-bit-content-hash` (bad-code).
The card was filed on 2026-10-09 but is not yet committed to `main`.
Roadmap item: A1 on branch `claude/roadmap-echo`.
Legend: CORE

## Hill

A reread of a file whose bytes changed is never reported as unchanged because
two contents share a short hash. `safe_read` does not return
`REREAD_UNCHANGED`, and `file_outline` does not serve a cached outline, for
content that differs from what the cache recorded.

## Evidence

- `hashContent` in `src/operations/observation-cache.ts` is 32-bit FNV-1a over
  UTF-16 code units. `ObservationCache.check` treats equal hashes as
  unchanged content.
- Two realistic one-line files collide:
  `export const limit = 33149;` and `export const limit = 908276;` both hash
  to `e75e6c8b`. Appending the same suffix to both, such as a trailing
  newline, preserves the collision (`baa4cf13`).
- Suppression turns a collision into silent staleness: `safe_read` returns the
  old outline with `REREAD_UNCHANGED`, and `file_outline` returns the old
  outline with `cacheHit: true`.
- The same hash decides `knowledge_map` staleness.

## Design

`hashContent` returns a versioned SHA-256 digest of the content:

- Content that is well-formed Unicode is hashed as its UTF-8 bytes and
  labelled `sha256:<hex>`. On the read path, content is a strict
  (`fatal`, BOM-preserving) UTF-8 decode of the observed bytes, so this digest
  is the SHA-256 of the observed bytes. That is the identity the proposed
  delivery ledger (`CORE_unchanged-outline-notice`) specifies, so the two
  agree.
- Content with a lone surrogate has no faithful UTF-8 encoding: UTF-8 would
  write it as U+FFFD and alias it with a string that contains U+FFFD. Such
  content is hashed as UTF-16LE code units and labelled
  `sha256-utf16le:<hex>`. The labels keep the two domains disjoint, so
  distinct strings never share an identity through the encoding.

An identity recorded before this change is an 8-digit hex string. It can never
equal a labelled digest, so an old cache snapshot reads as changed and is
reparsed. That fails toward extra work, never toward suppression.

## Playback Questions

### Agent

- [ ] After a colliding edit, does `safe_read` return the new content instead
      of `REREAD_UNCHANGED`?
- [ ] After a colliding edit, does `file_outline` reparse instead of
      returning `cacheHit: true`?
- [ ] Does an unchanged reread still hit the cache?

### Human

- [ ] Can I reproduce the collision on `main` and see it fixed here with one
      test file?

## Non-goals

- [ ] The per-consumer delivery ledger. Reread suppression still trusts a
      cache hit as delivery; that is roadmap item A2
      (`CORE_reread-suppression-trusts-cache-as-delivery`), which depends on
      this change.
- [ ] Comparing full bytes on a hash match. SHA-256 removes the practical
      collision; retaining full bytes per observation would cost memory for
      no further guarantee the rest of Graft relies on.
- [ ] Changing any other short digest in Graft. The truncated SHA-256
      identifiers elsewhere name records; they do not decide that content is
      unchanged.

## Acceptance Criteria

1. `ObservationCache.check` reports a miss, with the prior observation as
   stale, for the colliding pair.
2. `RepoWorkspace.safeRead` returns `content` for the second file after the
   first was read, and `fileOutline` does not report `cacheHit`.
3. Identical content still reports a cache hit.
4. A string with a lone surrogate and the same string with U+FFFD in its
   place have different identities.

## Test Strategy

RED: `test/unit/operations/observation-cache.test.ts` drives the colliding
pair through `ObservationCache.check`, `RepoWorkspace.safeRead` and
`RepoWorkspace.fileOutline` over an in-memory filesystem. On `main` the three
collision cases fail: the cache reports a hit. The unchanged-reread and
lone-surrogate cases pass on `main`; they guard criteria 3 and 4 against the
new encoding.

GREEN: replace FNV-1a with the labelled SHA-256 digest.

Validation: the focused test file and the existing knowledge-map, cache and
safe-read tests in the isolated runner, `pnpm typecheck`, `pnpm lint`,
`git diff --check`.
