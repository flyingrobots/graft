---
title: reference-count.ts uses ripgrep/grep instead of WARP-native queries
feature: structural-queries
kind: trunk
legend: CLEAN_CODE
effort: M
source_lane: bad-code
cycle: reference-count-uses-ripgrep
status: completed
requirements:
  - "Cross-file reference edges in WARP graph (shipped via indexHead)"
acceptance_criteria:
  - "reference-count.ts replaced with WARP graph query for reference counting"
  - "No ripgrep/grep subprocess spawning for symbol references"
retro: "docs/method/retro/reference-count-uses-ripgrep/reference-count-uses-ripgrep.md"
---

# reference-count.ts uses ripgrep/grep instead of WARP-native queries

## Relevance

Relevant. The runtime MCP paths had already moved to WARP graph queries, but
the legacy `src/warp/reference-count.ts` implementation and its direct tests
kept ripgrep/grep reference counting alive in the codebase.

## Original Card

`src/warp/reference-count.ts` shells out to ripgrep/grep to count symbol
references across the codebase. This is a legacy approach from before WARP had
cross-file import edges.

With `indexHead` now emitting `resolves_to` edges for imports, reference
counting can be done via WARP graph traversal instead of spawning subprocesses.
This is faster, more consistent, and does not require ripgrep to be installed.

Consumers listed by the original card:

- `src/mcp/tools/structural-blame.ts`
- `src/mcp/tools/structural-review.ts`

Those consumers now call WARP-backed paths, so this cycle removes the leftover
legacy implementation and migrates remaining tests off it.

## IBM Design Thinking

### Hills

- A maintainer can grep the source tree and find no symbol reference-count path
  that shells out to `rg` or `grep`.
- Existing blame/review behavior stays covered without depending on legacy text
  search.
- WARP graph reference counting owns the shared result type.

### Sponsor Users

- Agents using `graft_blame`, `graft_review`, and `graft_difficulty`.
- Maintainers reducing pre-v0.7 structural query code paths.

### Playback

- Does source code still contain `src/warp/reference-count.ts`?
- Do operation tests still import the removed ripgrep implementation?
- Do WARP reference-count tests still prove multi-file imports, unused symbols,
  same-name symbols, missing symbols, and re-exports?
- Do TypeScript ESM `.js` import specifiers resolve to `.ts` source files?
- Does the full suite pass without ripgrep-based reference counting?

## RED

The first RED check is structural: deleting `src/warp/reference-count.ts` breaks
tests that still import it. Those tests must move to WARP graph counting or
pure injected reference counters.

## GREEN

- `src/warp/warp-reference-count.ts` exports `ReferenceCountResult`.
- `src/warp/reference-count.ts` is deleted.
- `test/unit/warp/reference-count.test.ts` is deleted because
  `test/unit/warp/warp-reference-count.test.ts` covers the WARP implementation.
- Pure `structuralReview` operation tests use an injected no-reference counter.
- `structuralBlame` operation tests use `countSymbolReferencesFromGraph`.
- `ast-import-resolver` resolves TypeScript ESM `.js` specifiers to `.ts`
  source files, so WARP reference counts cover common TS source imports that
  used to be counted only by text search.
