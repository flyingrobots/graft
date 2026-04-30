---
title: "Retro: CORE_references-getEdges-fix"
cycle: "CORE_references-getEdges-fix"
conclusion: "pass"
---

# Retro: CORE_references-getEdges-fix

## Conclusion: PASS

Replaced `getEdges()` full scan in `references.ts` with `traverse.bfs`
+ `QueryBuilder` batch prop read. Same pattern as structural-queries.
6 existing tests pass unchanged. No `getEdges()` remains in the file.

## What went well

- Established pattern made this trivial — same traverse + query combo.
- `hasNode` guard for missing target (learned from structural-queries
  TraversalError).

## What drifted

Nothing. Straight application of the established pattern.

## Follow-on

Bad-code card `references-ts-getEdges-full-scan.md` is resolved. Delete it.
