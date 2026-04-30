# Retro: CORE_rewrite-structural-log

## What shipped

`structuralLogFromGraph(ctx, options?)` in `src/warp/warp-structural-log.ts`.
Produces structural log entries entirely from WARP graph — walks commit
nodes in reverse tick order, traverses adds/changes/removes edges per
commit. Zero git subprocess calls.

MCP tool `graft_log` swapped from git-log-based `structuralLog()` to
WARP-based `structuralLogFromGraph()`.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Uses worldline seek instead of git log | ✅ (uses commit node query, not worldline.seek() specifically) |
| Zero GitClient calls | ✅ No git import in the module |

## Drift check

- WarpContext + observeGraph convention ✅
- WARP module owns StructuralLogEntry types after
  `dead-code-old-git-operations` follow-up ✅
- No direct node imports, no port bypasses ✅

## Tests (4)

1. Returns structural log entries without git log
2. Empty for unindexed repo
3. Respects limit
4. Includes commit SHA in entries

## What went well

- Same pattern as churn rewrite — commit node query + per-commit edge traversal.
- MCP tool swap was clean.

## What to watch

- `since` parameter from the old tool schema is now unused in the WARP version.
  The WARP graph doesn't have date-based filtering — only tick-based. The tool
  still declares `since` in its schema but doesn't pass it through.
