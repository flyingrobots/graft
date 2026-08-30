# Invariant: Indexing Does Not Touch the Worktree

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

WARP indexing must never mutate the source worktree or its Git database.

## Why it matters

WARP refs and objects live in a private bare sidecar under
`~/.graft/graphs/<project>/<worktree>/<actor>/warp.git`. The source repository
is read as evidence only. If indexing changes its worktree, refs, objects,
config, or hooks, operator state and repository integrity are at risk.

Lazy indexing should be invisible. The operator runs a structural
query, graft backfills the worldline from git history, and `git
status` remains unchanged.

## How to check

- source `git status` is unchanged after lazy indexing
- source `refs/warp/*`, object counts, config, and hooks are unchanged
- no tracked or untracked source-worktree files are created or modified
- the expected private bare sidecar contains the WARP refs and objects
- test: snapshot source worktree and Git-database evidence before and after
  indexing, then assert that only the sidecar changed
