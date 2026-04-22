---
title: "Automatic worktree cleanup after parallel agent execution"
feature: agent-safety
kind: leaf
legend: CORE
lane: v0.7.0
requirements:
  - "Claude Code worktree isolation feature exists"
acceptance_criteria:
  - "Worktree directories are cleaned up after parallel agent execution"
  - "No .claude/worktrees/ paths appear in git commits"
---

# Automatic worktree cleanup after parallel agent execution

When launching parallel agents in isolated worktrees, the worktree directories survive after the agents complete and get accidentally committed as git submodule references. This happened twice this session — both Wave 6 and Waves 7-8 committed `.claude/worktrees/agent-*` as embedded repos that had to be manually cleaned up.

Fix directions:
- Claude Code could auto-prune worktrees after agent completion
- A post-commit hook could reject commits containing `.claude/worktrees/` paths
- The `.gitignore` could include `.claude/worktrees/` (but graft's `.claude/` is already gitignored — the issue is `git add -A` picks them up anyway because git treats embedded repos specially)
