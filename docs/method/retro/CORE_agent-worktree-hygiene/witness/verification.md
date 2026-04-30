# Verification: CORE_agent-worktree-hygiene

Date: 2026-04-26
Branch: `release/v0.7.0`

## Commands

| Command | Result |
| --- | --- |
| `pnpm guard:agent-worktrees` | pass: `agent worktree hygiene: pass` |
| `pnpm exec vitest run test/unit/git/agent-worktree-hygiene.test.ts test/unit/release/agent-worktree-hygiene-gate.test.ts` | pass: 2 files, 5 tests |
| `git diff --check` | pass |
| `pnpm lint` | pass |
| `pnpm test` | pass: 172 files, 1339 tests |

## Notes

- The behavior test stages a nested Git repository under
  `.claude/worktrees/agent-1` with `git add -f` and verifies the guard
  blocks the resulting gitlink path.
- The release-gate test verifies `pnpm release:check`,
  `scripts/hooks/pre-commit`, the release runbook, and the invariant
  all name the agent worktree guard.
