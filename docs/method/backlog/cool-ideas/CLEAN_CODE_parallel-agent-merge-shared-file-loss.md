---
title: "Parallel agent merge loses shared file edits on worktree cleanup"
legend: CLEAN_CODE
lane: cool-ideas
---

# Parallel agent merge loses shared file edits on worktree cleanup

Observed twice (v0.6.0 Wave 7-8, v0.7.0 AC2): when integrating N parallel agents that all modify the same shared files (capabilities.ts, tool-registry.ts, etc.), file copy (`cp`) is destructive — the last agent's version wins, silently dropping other agents' additions.

Root cause: using `cp` when the correct operation is `git merge`. Each agent worktree is a git branch. Git merge combines concurrent edits. File copy replaces them.

Fix direction: after parallel agents complete, merge their branches sequentially with `git merge`, not copy their files. Only use `cp` for new files that don't exist in the main tree (no overlap). For shared files that multiple agents modified, git merge is the correct tool.
