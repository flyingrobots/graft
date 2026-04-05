# Invariant: Projection Before Parse

**Status:** Planned
**Legend:** WARP

## What must remain true

If WARP already knows the structural answer for a committed state,
Graft must prefer projection over reparsing.

## Why it matters

A structural memory substrate that gets ignored is an expensive gym
membership. The whole point is that committed structural state is
pre-indexed. If `graft_diff`, `file_outline`, or `safe_read` still
reparse files when the worldline already has the answer, the
substrate is not earning its keep.

## How to check

- `graft_diff` on committed refs reads from WARP when indexed
- `file_outline` on committed files reads from WARP when indexed
- `safe_read` checks WARP before parsing
- Test: index a range, query it via tools, verify no tree-sitter
  parse calls for already-indexed commits
