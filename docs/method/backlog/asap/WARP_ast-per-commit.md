# WARP: AST per commit (branch worldlines)

First WARP integration. One worldline per branch, one node per
commit, AST of changed files attached as node data.

Enables `graft since <ref>` — structural delta between two commits
without touching the worktree.

Dependencies:
- git-warp@16 (published, stable)
- tree-sitter parser (already in graft)
- git post-commit hook (or lazy parse on first query)

See legend: WARP, Level 1.

Effort: L
