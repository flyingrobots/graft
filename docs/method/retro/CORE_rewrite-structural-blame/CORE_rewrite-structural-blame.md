# Retro: CORE_rewrite-structural-blame

## What shipped

`structuralBlameFromGraph(ctx, symbolName, filePath)` in
`src/warp/warp-structural-blame.ts`. Composes symbolTimeline (for
history) and countSymbolReferencesFromGraph (for references). Zero
git subprocess calls.

MCP tool `graft_blame` fully rewritten — no more commitsForSymbol
(deprecated), getCommitMeta (git show), or countSymbolReferences
(ripgrep). Output schema updated to match new shape.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Traces provenance through WARP ticks | ✅ Via symbolTimeline |
| Last-touch via ProvenanceIndex | ⚠️ Uses symbolTimeline, not ProvenanceIndex specifically |
| Zero GitClient calls | ✅ |

## Drift check

- Composes existing WARP modules (symbolTimeline, warp-reference-count) ✅
- Output schema updated in output-schemas.ts ✅
- No direct node imports ✅

## Tests (4)

1. Blame info from WARP without git calls
2. Tracks signature changes in history
3. Includes WARP-based reference count
4. Empty blame for nonexistent symbol

## What went well

- Composed existing modules instead of building from scratch.
- The eslint-disable for deprecated commitsForSymbol is no longer needed
  in structural-blame.ts — completely removed.

## What to watch

- Output schema is a BREAKING CHANGE for API consumers — the shape
  of graft_blame results changed. Old fields (kind, exported, created
  object, referencingFiles array) are gone. New fields (tick, present,
  createdInCommit as string) replaced them.
