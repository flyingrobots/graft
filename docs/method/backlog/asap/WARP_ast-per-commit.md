# WARP: Commit-level worldline

First WARP integration. Worldline mirrors the git commit timeline.
Each tick stores a structural delta patch (not full AST). The WARP
graph models the project-wide AST; materializing at any tick gives
the full structural state at that commit.

Tick patches are AST operations: add symbol, remove symbol, change
signature, move method. Post-commit hook parses changed files with
tree-sitter, diffs against previous materialized state, writes
the structural patch.

Enables `graft since <ref>` — structural delta between two commits
without touching the worktree.

Dependencies:
- git-warp@16 (published, stable)
- tree-sitter parser (already in graft)
- git post-commit hook (or lazy parse on first query)

See legend: WARP, Level 1.

Effort: L
