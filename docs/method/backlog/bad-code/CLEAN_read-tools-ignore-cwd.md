---
title: "read_range and safe_read silently ignore cwd"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-10-02
---

# read_range and safe_read silently ignore cwd

## Problem

Both tools accept a `cwd` argument. Passing `cwd` set to a second worktree of
the same repository (`~/git/graft-sludge-untyped`, a different branch) still
served files from the MCP server's own checkout (`~/git/graft`). Every
response's `path` field named `/Users/james/git/graft/...`, and a
`CHANGELOG.md` read returned the other branch's content. The call neither
honored `cwd` nor refused it.

Observed against the running 0.14.0 daemon install; not yet reproduced
against current source.

## Risk

An agent working in a worktree reads the wrong branch's files and has no
signal that it did, except by checking the returned `path`. Edits planned
from those reads target content that is not on disk where the agent thinks.

## Desired Outcome

`cwd` either routes the read to that worktree, or the call refuses with a
reason that points at `workspace_open`. A read is never quietly served from a
different checkout than the one requested.

## Acceptance Criteria

- A read with `cwd` naming a different worktree of the same repository
  returns that worktree's file, or a governed refusal.
- The behavior holds for `safe_read`, `read_range`, and `file_outline`.
