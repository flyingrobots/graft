---
title: "code_find answers from a partially indexed WARP graph after lazy indexing"
feature: core
kind: bad-code
legend: CORE
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-10-21
---

# code_find answers from a partially indexed WARP graph after lazy indexing

## Problem

`runCodeFind` (`src/mcp/tools/code-find.ts`) searches the WARP index whenever
the index holds a boundary for `HEAD` (`getIndexedCommitCeilings(...).has(headSha)`),
and parses live files otherwise. A successful `code_find` lazily indexes the
files of its visible matches (`lazyIndexReadPaths`), which records a `HEAD`
boundary covering only those files. Every later `code_find` in the session
then answers from that partial index.

Observed while writing `test/unit/mcp/code-find-confidentiality.test.ts`: in
a repository with `src/surface.ts` (defining `createSurface`) and
`src/token.ts` (defining `rotateApiToken`), `code_find createSurface`
followed by `code_find rotateApiToken` returned zero matches. The same query
first in a fresh session returned the `src/token.ts` definition from the live
path.

## Risk

An agent gets "no such symbol" for symbols that exist, with no signal that
the answer covered only the files earlier calls happened to index. This is
the coverage problem A4 fixed for dead symbols, on a different surface.

## Desired Outcome

`code_find` uses the WARP index only when the index covers the searched
domain at `HEAD` (for example with `readIndexCoverage` from the A4 branch),
or reports the coverage it searched, and otherwise answers from the live
parse.

## Acceptance Criteria

- In one session, a `code_find` that lazily indexes one file does not stop a
  later `code_find` from finding a symbol defined in an unindexed file.
- Or the later answer reports partial coverage and names what it did not
  search.
