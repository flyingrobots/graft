---
title: "Agent worktree hygiene"
legend: "CORE"
cycle: "CORE_agent-worktree-hygiene"
source_backlog: "docs/method/backlog/v0.7.0/CORE_agent-worktree-hygiene.md"
---

# Agent worktree hygiene

Source backlog item:
`docs/method/backlog/v0.7.0/CORE_agent-worktree-hygiene.md`
Legend: CORE

## Hill

Agent isolation worktrees under `.claude/worktrees/` cannot silently
enter Graft history as tracked files or embedded-repo gitlinks. The
guard checks the Git index before release preflight and before the
repo-local pre-commit hook proceeds to lint.

## Playback Questions

### Human

- [x] If an embedded repo under `.claude/worktrees/agent-*` is forced
      into the index, does the guard name the offending path?
- [x] Does the repo-local pre-commit hook run the guard before lint?
- [x] Does release preflight include the guard before the longer
      validation sequence?

### Agent

- [x] Is the guard tested against a real temp Git repo with an embedded
      nested repo staged as a gitlink?
- [x] Does the guard avoid inherited host `GIT_*` variables when
      running Git subprocesses?
- [x] Does the release-gate test keep the package script, runbook,
      invariant, and pre-commit hook aligned?

## Non-goals

- [x] Automatically pruning Claude Code's worktree directories. That
      lifecycle belongs to the agent runtime, not this repository.
- [x] Changing the product target-repo transition hook bootstrap. The
      existing `post-checkout`, `post-merge`, and `post-rewrite` hooks
      remain transition observers, not staged-content policy.
- [x] Treating `.gitignore` as sufficient. Ignore rules are still
      useful, but this guard protects the index directly.

## Backlog Context

Parallel agent work can leave isolated worktrees behind. If a nested
Git repository under `.claude/worktrees/` is added to the parent index,
Git records it as an embedded repository entry. That can reach commits
without carrying the nested repo content, which is never the intended
release artifact.

The repair is a repo-local process guard:

- `scripts/check-agent-worktree-hygiene.ts` inspects
  `git ls-files --stage -- .claude/worktrees`
- `pnpm guard:agent-worktrees` exposes the check
- `scripts/hooks/pre-commit` runs it before lint
- `pnpm release:check` runs it before the release validation sequence
