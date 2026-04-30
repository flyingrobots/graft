---
title: "Retro: CORE_rewrite-structural-review-to-use-warp-graph-queries"
cycle: "CORE_rewrite-structural-review-to-use-warp-graph-queries"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_rewrite-structural-review-to-use-warp-graph-queries.md"
outcome: "hill-met"
drift_check: yes
---

# Retro: CORE_rewrite-structural-review-to-use-warp-graph-queries

## What shipped

Structural-review's reference counting callback swapped from
ripgrep/grep subprocess to WARP graph traversal.

New module: `src/warp/warp-reference-count.ts`
- `countSymbolReferencesFromGraph(ctx, symbolName, filePath?)`
- Wraps `referencesForSymbol()` which traverses incoming `references`
  edges from import specifier AST nodes

Changed: `src/mcp/tools/structural-review.ts`
- Removed `nodeProcessRunner` import
- Removed `countSymbolReferences` (ripgrep) import
- Callback now calls `ctx.getWarp()` → `countSymbolReferencesFromGraph`

## Tests (5)

1. Multi-file imports → count=2
2. Unused symbol → count=0
3. Same-name different file → correct disambiguation
4. Symbol not in graph → graceful count=0
5. Re-export counts as reference

## What went well

- `referencesForSymbol()` already existed in `src/warp/references.ts`
  with full WARP graph traversal. The new module is just a thin
  adapter returning `ReferenceCountResult`.
- The hexagonal architecture paid off: operation layer unchanged,
  only the callback in the MCP tool layer changed.

## What to watch

- `reference-count.ts` (ripgrep version) is still used by
  `structural-blame.ts`. That's a separate rewrite card
  (`CORE_rewrite-structural-blame`). Once blame is rewritten,
  `reference-count.ts` can be deleted entirely.
- The import resolver doesn't handle TypeScript's `.js` → `.ts`
  extension mapping (`import from './foo.js'` when file is `foo.ts`).
  Tests must use extensionless imports to match.
