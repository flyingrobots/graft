---
title: "Surfaces other than code_refs still derive responses from confidential files"
feature: core
kind: bad-code
legend: CORE
lane: bad-code
priority: 1
effort: M
status: open
reported: 2026-10-21
---

# Surfaces other than code_refs still derive responses from confidential files

## Problem

`docs/invariants/banned-never-leak.md` now states the content-denial rule: a
confidential (`SECRET`) file's content must not influence any response. The
A3 branch makes `code_refs` meet it. Other surfaces do not yet, by code
reading:

- `code_find` returns a refusal naming a confidential file, with its size,
  when a symbol query matches only inside it, and zero matches otherwise. That
  split is a query-controlled oracle over symbol names in files such as
  `credentials.ts` or `credentials.json`. Fixed by the `code_find`
  confidential prefilter (`docs/design/CORE_code-find-confidential-prefilter.md`),
  witnessed by `test/unit/mcp/code-find-confidentiality.test.ts`.
- `safe_read`, `file_outline` and other read refusals report `actual.lines`
  and `actual.bytes` for a refused confidential file
  (`src/operations/safe-read.ts` copies `policy.actual` into every result).
  The size is derived from the content.
- Structural indexing selects files by language alone
  (`selectParseableFiles` in `src/warp/index-head.ts`), so a parseable
  confidential file such as `credentials.ts` can enter the WARP graph, and
  its symbol names can surface through `graft_map`, `graft_dead_symbols`,
  `code_find`'s WARP path and reference counts.
- Coverage reports (A4) name missing files; a confidential path may be named.

Only the first item had a failing witness, and it is fixed. The others are
inferred from the source.

## Risk

Where Graft is an agent's only read interface, or operators rely on its
refusals as a control, each item leaks content-derived facts (size, symbol
names) or existence metadata about secret files. `SECURITY.md` puts "secret
exposure through any command" in scope.

## Desired Outcome

Every surface decides confidentiality with `isConfidentialPath`
(`src/policy/confidential.ts`) before reading content, and reports neither a
confidential file's content-derived facts nor, unless explicitly declared
public, its existence. Indexing never parses confidential files.

## Acceptance Criteria

- A paired-repository witness per surface, in the style of
  `test/unit/mcp/code-refs-confidentiality.test.ts`: repositories differing
  only in a confidential file's content (and, where existence is not declared
  public, in its existence) produce identical responses, with only per-call
  receipt fields removed.
- Refusals for confidential files carry no `actual` size.
- `indexHead` never indexes a confidential path.
