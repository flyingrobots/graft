---
title: "Agent worktree hygiene"
cycle: "CORE_agent-worktree-hygiene"
design_doc: "docs/design/CORE_agent-worktree-hygiene.md"
source_backlog: "docs/method/backlog/v0.7.0/CORE_agent-worktree-hygiene.md"
outcome: hill-met
drift_check: yes
---

# Agent worktree hygiene Retro

## Summary

The hill was met. Graft now has a repo-local guard that rejects tracked
or staged `.claude/worktrees/` paths before they can become release
history.

This closes the active v0.7.0 backlog card by retro/witness, not by a
graveyard tombstone.

## What Shipped

- Added `scripts/check-agent-worktree-hygiene.ts`, which checks the Git
  index with `git ls-files --stage -- .claude/worktrees`.
- Added `pnpm guard:agent-worktrees`.
- Wired the guard into `pnpm release:check` before lint, typecheck,
  test, security, and pack checks.
- Wired the guard into `scripts/hooks/pre-commit` before lint.
- Added unit coverage for forced embedded-repo gitlinks under ignored
  `.claude/worktrees/` paths.
- Added a release-gate test that keeps the package script,
  pre-commit hook, release runbook, and invariant aligned.
- Documented the process invariant in
  `docs/invariants/agent-worktree-hygiene.md`.

## Validation

- `pnpm guard:agent-worktrees`
- `pnpm exec vitest run test/unit/git/agent-worktree-hygiene.test.ts test/unit/release/agent-worktree-hygiene-gate.test.ts`
- `git diff --check`
- `pnpm lint`
- `pnpm test`

## Follow-On Pressure

This guard prevents bad paths from entering Graft history, but it does
not delete local agent worktree directories after parallel agent runs.
Automatic pruning still belongs to the agent runtime or a separate
operator cleanup command, not to this release guard.

Separate release-preflight debt surfaced during validation:
`pnpm typecheck` currently fails on existing strict TypeScript issues
outside this card. Filed as
`docs/method/backlog/bad-code/typecheck-release-preflight-errors.md`.
