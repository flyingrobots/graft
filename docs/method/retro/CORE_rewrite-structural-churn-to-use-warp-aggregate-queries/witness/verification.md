# Verification: CORE_rewrite-structural-churn-to-use-warp-aggregate-queries

Date: 2026-04-26
Branch: `release/v0.7.0`

## Commands

| Command | Result |
| --- | --- |
| `pnpm exec vitest run test/unit/warp/warp-structural-churn.test.ts` | pass: 1 file, 6 tests |
| `git diff --check` | pass |
| `pnpm guard:agent-worktrees` | pass |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | pass: 173 files, 1346 tests |

## Notes

- The focused WARP churn test proves aggregate query usage through
  `QueryBuilder.aggregate()`.
- The removed-symbol test proves tombstoned symbols are still counted
  from tick receipt evidence.
- The full suite proves the `graft_churn` output contract remains
  compatible with existing MCP and schema coverage.
