---
title: "Rewrite structural-review to use WARP graph queries"
legend: "CORE"
cycle: "CORE_rewrite-structural-review-to-use-warp-graph-queries"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-review-to-use-warp-graph-queries.md"
---

# Rewrite structural-review to use WARP graph queries

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-structural-review-to-use-warp-graph-queries.md`
Legend: CORE

## Hill

After this cycle, the `graft_review` MCP tool counts symbol reference
impact via WARP graph traversal instead of shelling out to ripgrep/grep.
The operation itself (`structuralReview`) is unchanged — it already takes
a `countReferences` callback. Only the callback implementation changes.

## Current state

`src/mcp/tools/structural-review.ts` creates a `countReferences` callback
that calls `countSymbolReferences()` from `reference-count.ts`. That
function:

1. Lists all tracked + untracked files via `git ls-files`
2. Spawns `rg` (fallback: `grep`) with word-boundary matching
3. Returns files containing the symbol name as text

Problems:
- Requires ripgrep installed (or falls back to grep)
- Text-match heuristic — not actual import-level references
- Spawns subprocesses per symbol (slow for many breaking changes)

## Target state

Replace the ripgrep callback with a WARP graph query. `indexHead` already
emits `references` edges from import specifier AST nodes to `sym:*` nodes
via `resolveImportEdges()` in `ast-import-resolver.ts`.

The WARP approach:
1. Find all nodes with `references` edges pointing TO the target sym node
2. Extract file paths from the source node IDs (`ast:{filePath}:{hash}`)
3. Return count + file list

This is more precise (actual imports, not text matches) and faster (no
subprocess spawning).

## Architecture

The change is minimal and stays hexagonal:

```
src/operations/structural-review.ts  — UNCHANGED (takes ReferenceCounter callback)
src/mcp/tools/structural-review.ts   — swap callback: ripgrep → WARP query
src/warp/reference-count.ts          — UNCHANGED (blame still uses it)
src/warp/warp-reference-count.ts     — NEW: WARP-based reference counter
```

### New module: `src/warp/warp-reference-count.ts`

```ts
countSymbolReferencesFromGraph(
  ctx: WarpContext,
  symbolName: string,
  filePath?: string,
): Promise<ReferenceCountResult>
```

Uses `observeGraph` to find incoming `references` edges to the sym node.

## Edge topology in the WARP graph

From `ast-import-resolver.ts`:
- `import { foo } from "./bar"` → `ast:{importing-file}:{hash}` --references--> `sym:{bar.ts}:{foo}`
- `import * as ns from "./bar"` → `ast:{importing-file}:{hash}` --references--> `file:{bar.ts}`
- `export { foo } from "./bar"` → `ast:{re-exporting-file}:{hash}` --references--> `sym:{bar.ts}:{foo}`

To count references to symbol `foo` in `bar.ts`:
1. Match `sym:bar.ts:foo`
2. Find all incoming `references` edges
3. Extract unique file paths from the source AST node IDs

## Playback Questions

### Human

- [ ] Does `graft_review` still detect breaking changes with correct impact counts?
- [ ] Is the reference count at least as accurate as ripgrep for import-level refs?

### Agent

- [ ] Does `countSymbolReferencesFromGraph` return correct count for multi-file imports?
- [ ] Does it return 0 for unused symbols?
- [ ] Does it exclude the definition file when `filePath` is provided?
- [ ] Does it handle namespace imports (`import * as`) correctly?
- [ ] Does the structural-review test suite still pass with the WARP callback?
- [ ] Lint clean, all tests pass?

## Test plan

### Golden path
1. Create repo with `lib.ts` (exports `createUser`), `handler.ts` (imports it), `service.ts` (imports it)
2. Index with `indexHead`
3. Call `countSymbolReferencesFromGraph(ctx, "createUser", "lib.ts")`
4. Assert: count=2, files=["handler.ts", "service.ts"]

### Edge cases
1. **Unused symbol** — exported but never imported → count=0
2. **No filePath filter** — include definition file in count
3. **Namespace import** — `import * as lib from "./lib"` → references `file:lib.ts`, not individual syms
4. **Re-export** — `export { foo } from "./lib"` → counts as reference
5. **Same-name different file** — `createUser` in `a.ts` vs `b.ts` → only count refs to the right one
6. **Symbol not in graph** — return count=0 gracefully

### Known failure modes
- Symbol exists but was never imported (ripgrep would find text usage, WARP won't) — EXPECTED and CORRECT for import-level reference counting
- Dynamic imports create `resolves_to` edges to files but not `references` edges to specific symbols — acceptable

## Non-goals

- [ ] Rewriting `structural-blame`'s reference counting (separate cycle)
- [ ] Deleting `reference-count.ts` (blame still uses it)
- [ ] Adding non-import reference detection (function call sites within files)

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: N/A (infrastructure)
- Non-visual or alternate-reading expectations: N/A

## Localization and Directionality

- Locale / wording / formatting assumptions: N/A
- Logical direction / layout assumptions: N/A

## Agent Inspectability and Explainability

- What must be explicit: reference counts come from WARP graph edges, not text search
- What must be attributable: each reference is traceable to a specific import statement AST node

Effort: S
