# Agent worktree hygiene

**Legend:** CORE

No path under `.claude/worktrees/` may be tracked or staged in the
Graft repository.

Claude Code and other parallel-agent runtimes may create isolated
worktrees under `.claude/worktrees/`. Those directories are local
execution artifacts. They are not source, they are not submodules, and
they must not become embedded-repo gitlinks in Graft commits.

## If violated

Commit history can contain a gitlink to an agent scratch worktree
instead of real source content. Clones of the repository will not carry
that nested content, and release review has to clean up accidental
artifact history.

## How to verify

- `pnpm guard:agent-worktrees`
- `scripts/check-agent-worktree-hygiene.ts`
- repo-local `scripts/hooks/pre-commit`
- `pnpm release:check`
