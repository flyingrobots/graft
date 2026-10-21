---
title: "code_find never reads confidential files"
legend: "CORE"
cycle: "CORE_code-find-confidential-prefilter"
source_backlog: "Review of the A1/A3/A4 packet (2026-10-21), A3 SHOULD: fix code_find in its own change"
---

# code_find never reads confidential files

Source: the 2026-10-21 review of the A3 packet (`code_refs` skipped
reporting) ruled that `code_find` has the same oracle on `main` and should be
fixed promptly in its own change. The product-wide confidentiality claim stays
incomplete until it lands.
Legend: CORE

## Hill

A `code_find` answer is identical whatever a confidential file contains, and
whether or not it exists. Confidential files are never parsed, loaded or
matched, on the live path or from the WARP index.

## Evidence

- `src/mcp/tools/code-find.ts` parses every candidate file on the live path
  (`searchLiveSymbols`), or reads indexed symbols on the WARP path
  (`searchWarpSymbols`). Only afterwards does it load each matched file and
  apply policy.
- When every match is refused, it returns a refusal naming the first refused
  file with its line and byte counts. When nothing matches, it returns zero
  matches. A file named `credentials.ts` is `SECRET` but parseable, so a
  symbol query matching only inside it yields a refusal, and a non-matching
  query yields zero matches: a query-controlled oracle over its symbol names,
  plus its size.
- Structural indexing selects files by language alone
  (`selectParseableFiles` in `src/warp/index-head.ts`), so a confidential
  `credentials.ts` can be in the WARP index too.

## Design

- Confidentiality is decided by file name with `isConfidentialPath`
  (`src/policy/confidential.ts`), independently of which ban a refusal would
  display. `dist/credentials.js` is refused as `BUILD_OUTPUT` but is still
  confidential.
- Live path: confidential files are removed from the candidate list before
  `searchLiveSymbols` parses anything.
- WARP path: matches whose path is confidential are dropped before any file is
  loaded or any policy is evaluated.
- Relevance bans (`BINARY`, `LOCKFILE`, `MINIFIED`, `BUILD_OUTPUT`,
  `GRAFTIGNORE`) are unchanged: their matches still produce a refusal when no
  match is visible.
- The output shape does not change, so `graft.mcp.code_find` keeps `2.0.0`.
  Stating the content-denial rule in the answer, as `code_refs` does with
  `contentDenial`, belongs with the shared answer terms (A5).

## Playback Questions

### Agent

- [ ] With no visible match, do repositories differing only in whether
      `credentials.ts` defines the queried symbol answer identically?
- [ ] Beside a visible match, do they answer identically?
- [ ] Is `dist/credentials.js` kept out although it displays as
      `BUILD_OUTPUT`?
- [ ] After HEAD is indexed, does the WARP path answer identically?
- [ ] Does the answer reveal whether a confidential file exists?

### Human

- [ ] Can I rely on `code_find` not to confirm guesses about a secret file?

## Non-goals

- [ ] Keeping confidential files out of the WARP index itself, and the other
      surfaces listed in the confidential-content audit card (read refusal
      sizes, maps, dead symbols, reference counts). This change filters what
      `code_find` returns; it does not change indexing.
- [ ] A schema change to state the rule in the answer.

## Acceptance Criteria

1. Paired repositories differing only in a confidential file's content
   produce identical `code_find` responses, with and without visible matches,
   on the live and WARP paths, across warm-up, exact, glob and scoped calls.
2. A pair differing only in whether the confidential file exists produces
   identical responses.
3. Visible definitions are still found.

## Test Strategy

RED: `test/unit/mcp/code-find-confidentiality.test.ts` builds paired
repositories and compares whole response sequences, with the wall clock and
session id pinned and only the random trace id replaced. On `main` the
no-visible-match pairs differ through the refusal versus zero-matches split
and the refused file's size.

GREEN: filter confidential paths before the live parse and before the WARP
match loop.

Validation: `test/unit/mcp/code-find-confidentiality.test.ts`,
`test/unit/mcp/precision.test.ts`, `test/unit/policy/confidential.test.ts`
and `test/unit/contracts/output-schemas.test.ts` in the isolated runner, the
full suite, `pnpm typecheck`, `pnpm lint`, `git diff --check`.

## Retro

`docs/method/retro/CORE_code-find-confidential-prefilter/retro.md`.
