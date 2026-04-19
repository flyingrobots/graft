---
title: "CI-003 — MCP-native \"Diff\" Protocol"
---

# CI-003 — MCP-native "Diff" Protocol

Legend: [CORE — Core Governor](../../legends/CORE-core-governor.md)

## Idea

Standard MCP tools return text blocks. For structural diffs (added/removed symbols), Graft currently serializes a JSON structure into that text block.

Propose or implement a more native "Diff" response type for Graft that allows the client (Cursor, Windsurf) to render the structural changes using their own UI primitives rather than parsing a large JSON blob. This could include "Deep Links" to specific line ranges in the worktree.

## Why

1. **Efficiency**: Reduces the context burden of reading a structural diff.
2. **UX**: Allows for a much cleaner presentation of project-wide structural shifts.
3. **Leadership**: Positions Graft as a leader in the MCP ecosystem by driving richer response types.

## Effort

Medium — requires defining the protocol and updating the `graft_diff` and `graft_since` tools.
