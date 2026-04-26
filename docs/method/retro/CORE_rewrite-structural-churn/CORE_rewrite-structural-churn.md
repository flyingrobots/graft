# Retro: CORE_rewrite-structural-churn

## What shipped

`structuralChurnFromGraph(ctx, options?)` in `src/warp/warp-structural-churn.ts`.
Computes structural churn entirely from WARP graph — walks commit nodes,
traverses outgoing adds/changes/removes edges, accumulates per-symbol
change counts. Zero git subprocess calls.

MCP tool `graft_churn` swapped from git-log-based `structuralChurn()` to
WARP-based `structuralChurnFromGraph()`.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| WARP queries instead of per-commit iteration | ✅ Walks commit nodes from graph |
| Zero GitClient calls | ✅ No git import in the module |
| Change counts natively in WARP | ⚠️ Data from WARP but accumulation in Map, not QueryBuilder.aggregate() |

## Gap

Card specified `QueryBuilder.aggregate()` for native count computation.
Implementation uses traverse.bfs per commit + in-memory Map accumulation.
Functionally correct and still eliminates all git calls, but doesn't use
the aggregate API. The aggregate approach would avoid per-commit traversal
entirely — a follow-up optimization opportunity.

Follow-up closure: `CORE_rewrite-structural-churn-to-use-warp-aggregate-queries`
closed this gap by moving live-symbol churn counts to
`QueryBuilder.aggregate()` and preserving tombstoned-symbol churn through
tick receipt evidence.

## Drift check

- WarpContext + observeGraph convention ✅
- QueryResultV1 from git-warp ✅
- Reuses ChurnEntry/StructuralChurnResult types from operations layer ✅
- No direct node imports, no port bypasses ✅
- Per-sym getNodeProps could be batched via query (minor) ⚠️

## Tests (4)

1. Counts symbol changes across commits without git log
2. Empty result for unindexed repo
3. Respects limit parameter
4. Makes zero GitClient calls

## What went well

- The existing ChurnEntry type was reusable — no new output types needed.
- The MCP tool swap was clean: one import change, one function call change.
- Old structuralChurn() remains available for callers that don't have WarpContext.

## What to watch

- Per-commit traverse.bfs is O(commits × edge_fanout). For repos with
  thousands of commits, this could be slow. Consider QueryBuilder.aggregate()
  as a follow-up optimization.
- Old structural-churn.ts with its git log approach is still in the codebase.
  It's not dead — tests still use it — but the MCP tool no longer calls it.
