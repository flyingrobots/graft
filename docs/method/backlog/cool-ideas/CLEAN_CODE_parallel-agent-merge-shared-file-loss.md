---
title: "Parallel agent merge loses shared file edits on worktree cleanup"
feature: agent-safety
kind: leaf
legend: CLEAN_CODE
lane: cool-ideas
effort: M
requirements:
  - "Parallel agent worktree support (shipped)"
  - "Git merge infrastructure (shipped)"
acceptance_criteria:
  - "After parallel agents complete, their branches are merged sequentially with `git merge`, not file copy"
  - "Shared files modified by multiple agents are combined via three-way merge, not overwritten"
  - "New files that exist only in one agent's worktree are copied without merge"
  - "A test scenario with N agents modifying the same file preserves all agents' additions"
---

# Parallel agent merge loses shared file edits on worktree cleanup

Observed twice (v0.6.0 Wave 7-8, v0.7.0 AC2): when integrating N parallel agents that all modify the same shared files (capabilities.ts, tool-registry.ts, etc.), file copy (`cp`) is destructive — the last agent's version wins, silently dropping other agents' additions.

Root cause: using `cp` when the correct operation is `git merge`. Each agent worktree is a git branch. Git merge combines concurrent edits. File copy replaces them.

Fix direction: after parallel agents complete, merge their branches sequentially with `git merge`, not copy their files. Only use `cp` for new files that don't exist in the main tree (no overlap). For shared files that multiple agents modified, git merge is the correct tool.

## Implementation path

1. Identify the worktree cleanup code path that currently uses `cp` to integrate parallel agent results back into the main worktree.
2. Replace the `cp`-based integration with `git merge`: after each agent completes on its worktree branch, merge that branch into the integration branch using `git merge`.
3. Handle merge conflicts: when `git merge` reports conflicts on a shared file, surface the conflict to the orchestrating agent with structural context (which symbols conflict, from which agents).
4. For new files (exist only in one agent's worktree, not in the base), `cp` is still valid since there's no overlap.
5. Add a test: spawn N agents that all modify the same file (e.g., adding different exports), verify all additions are preserved after integration.

## Related cards

- **CORE_multi-agent-conflict-detection**: Conflict detection notifies agents in real-time when their read context is invalidated by another agent's write. This card fixes the merge step after agents finish. Complementary — conflict detection could prevent the problem by warning agents before they create conflicting changes, but the merge fix is needed regardless because agents may intentionally modify the same files.
- **WARP_semantic-merge-conflict-prediction**: Semantic merge prediction detects structural incompatibilities pre-merge (e.g., signature change + call using old signature). This card fixes the merge mechanism itself (git merge vs. file copy). Prediction detects subtle semantic problems; this card fixes the blunt data-loss problem. No dependency — they operate at different levels.
- **WARP_shadow-structural-workspaces**: Shadow workspaces give each agent an isolated structural view with deterministic collapse. This card is the pragmatic, shipped-infrastructure fix for the same problem. Shadow workspaces are the long-horizon solution; this is the immediate fix. No dependency.
- **CORE_agent-handoff-protocol**: Handoff transfers context between sequential agents. This card handles the merge of parallel agents. Different coordination patterns. No dependency.

## No dependency edges

All prerequisites are shipped. The fix is a change to the existing worktree cleanup code path — no new infrastructure needed. No other card requires this fix as a prerequisite, and no backlog card must ship first.

## Effort rationale

Medium. The core fix (replace `cp` with `git merge`) is conceptually simple but requires: (a) identifying all code paths that integrate parallel agent results, (b) handling merge conflicts gracefully (what does the orchestrator do when git merge conflicts?), (c) preserving the `cp` path for new-only files, and (d) testing with realistic multi-agent scenarios. The conflict-handling UX is the hardest design decision.
