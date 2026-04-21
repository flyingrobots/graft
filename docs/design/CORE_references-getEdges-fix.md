---
title: "Fix references.ts getEdges() full scan"
legend: "CORE"
cycle: "CORE_references-getEdges-fix"
source_backlog: "docs/method/backlog/bad-code/references-ts-getEdges-full-scan.md"
---

# Fix references.ts getEdges() full scan

Source: bad-code backlog item filed during CORE_rewrite-structural-queries

## Hill

`referencesForSymbol` no longer pulls all visible edges into memory.
It uses `traverse.bfs` for edge discovery and `query().match().select()`
for batch prop reads — the same pattern established in
`structural-queries.ts`.

## Design

Current: `obs.getEdges()` → filter for `references` edges → per-node
`getNodeProps()`.

New:
1. `traverse.bfs(targetId, { dir: 'in', labelFilter: 'references', maxDepth: 1 })`
   — finds AST nodes that reference the target. Substrate-side.
2. Guard for missing target node (traverse throws on missing start).
3. `query().match(referrerIds).select(["id", "props"])` — batch prop read.
4. Extract `importedName`, `localName`, `filePath` from props.

Same public API, same return type.

## Playback Questions

### Agent
- [ ] Do existing `references-for-symbol` tests pass unchanged?
- [ ] Does `pnpm lint` pass?
- [ ] Does the file no longer contain `getEdges()`?

## Test Plan

### Golden path
1. Existing 6 tests in `references-for-symbol.test.ts` pass unchanged.
2. No `getEdges()` in the file.

### Edge cases
- Target node doesn't exist → return empty array (guard).
- Zero incoming references → return empty array.
