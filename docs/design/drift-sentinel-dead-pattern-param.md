---
title: "drift-sentinel declares unused 'pattern' parameter"
feature: docs-integrity
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# drift-sentinel declares unused 'pattern' parameter

## Relevance

Relevant. A declared option that is silently ignored is a truth-surface bug.

## Original Card

`DriftSentinelOptions.pattern` is declared in the interface but never read in
`runDriftSentinel`. Either wire it (filter which .md files to check) or remove
it.

Affected files:

- `src/warp/drift-sentinel.ts` line 14

## Design

Use the existing `picomatch` dependency to filter tracked markdown files after
`git ls-files` and before per-file stale-doc checks.

## Tests

`test/unit/warp/drift-sentinel.test.ts` verifies that a pattern limits the scan
to matching markdown files.
