# Retro: reference-count-uses-ripgrep

## What shipped

Both consumers of reference-count.ts migrated to WARP graph queries:
- structural-review: cycle 8 (warp-reference-count.ts)
- structural-blame: this session (warp-structural-blame.ts)

The leftover ripgrep implementation has now been removed:

- Deleted `src/warp/reference-count.ts`
- Deleted legacy `test/unit/warp/reference-count.test.ts`
- Moved pure structural-review operation tests to injected reference counters
- Moved structural-blame operation tests to `countSymbolReferencesFromGraph`
- `src/warp/warp-reference-count.ts` owns the shared `ReferenceCountResult`
  type
- `src/warp/ast-import-resolver.ts` now resolves TypeScript ESM `.js`
  specifiers to `.ts` source files for reference edges

## Status

Resolved across multiple cycles. No remaining source path uses ripgrep or grep
for WARP symbol reference counting.

## Verification

- `pnpm exec vitest run test/unit/warp/ast-import-resolver.test.ts test/unit/warp/warp-reference-count.test.ts test/unit/operations/structural-blame.test.ts test/unit/operations/structural-review.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm guard:agent-worktrees`
- `pnpm test`
