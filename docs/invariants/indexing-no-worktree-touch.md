# Invariant: Indexing Does Not Touch the Worktree

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

WARP indexing must never mutate the working tree.

## Why it matters

WARP data lives under `refs/warp/graft-ast/` — git objects, not
working tree files. If indexing dirties the repo (creates tracked
files, modifies existing files, leaves untracked spill), the
operator's `git status` changes, uncommitted work is at risk, and
the magic dies instantly.

Lazy indexing should be invisible. The operator runs a structural
query, graft backfills the worldline from git history, and `git
status` remains unchanged.

## How to check

- `git status` is unchanged after lazy indexing
- No tracked file modifications during indexing
- No untracked file creation except approved internal git objects
  under `.git/`
- Test: snapshot `git status` before and after indexing, assert equal
