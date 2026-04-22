---
title: "CI-003 — MCP-native \"Diff\" Protocol"
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "graft_diff tool (shipped)"
  - "graft_since tool (shipped)"
  - "Structural diff with summary lines (shipped)"
  - "MCP server with stdio transport (shipped)"
acceptance_criteria:
  - "Graft defines a structured Diff response type richer than plain text JSON blobs"
  - "The Diff response includes deep links to specific line ranges in the worktree"
  - "graft_diff and graft_since tools emit the new Diff response type"
  - "At least one MCP client (Cursor or Windsurf) can render the structured diff using its own UI primitives"
---

# CI-003 — MCP-native "Diff" Protocol

Legend: [SURFACE — Surface Layer](../../legends/CORE-core-governor.md)

## Idea

Standard MCP tools return text blocks. For structural diffs (added/removed symbols), Graft currently serializes a JSON structure into that text block.

Propose or implement a more native "Diff" response type for Graft that allows the client (Cursor, Windsurf) to render the structural changes using their own UI primitives rather than parsing a large JSON blob. This could include "Deep Links" to specific line ranges in the worktree.

## Why

1. **Efficiency**: Reduces the context burden of reading a structural diff.
2. **UX**: Allows for a much cleaner presentation of project-wide structural shifts.
3. **Leadership**: Positions Graft as a leader in the MCP ecosystem by driving richer response types.

## Implementation path

1. Design the structured Diff response schema: a JSON structure with per-file sections, each containing symbol-level changes (added/removed/modified) with line ranges, kinds, and semantic annotations.
2. Include deep-link fields: file path + line range pairs that MCP clients can use to open the relevant code in the editor.
3. Update `graft_diff` and `graft_since` tool handlers to emit the new structured response alongside or instead of the current text serialization.
4. Define a fallback: clients that don't understand the structured format still receive the text representation. The response should degrade gracefully.
5. Test with at least one MCP client that supports rich rendering (Cursor's tool result rendering, or similar).
6. Document the schema so other MCP servers can adopt it as a de facto standard.

## Related cards

- **SURFACE_ide-native-graft-integration**: IDE integration addresses the broader surface of embedding Graft into editor UIs. The diff protocol is one specific response type within that surface. Complementary but independent — the diff protocol can ship as a standalone improvement to existing MCP tools without requiring full IDE integration.
- **SURFACE_local-history-dag-render-mode-and-count-legend**: DAG render mode addresses how structural history is visualized. The diff protocol addresses how structural changes are communicated to MCP clients. Different layers (visualization vs. wire format). No dependency.
- **WARP_outline-diff-commit-trailer**: Outline diff trailers embed structural diffs into commit messages. The MCP diff protocol embeds structural diffs into MCP tool responses. Same data, different transport. No dependency.

## No dependency edges

All prerequisites are shipped. The diff tools already produce structural diff data — this card changes the wire format of their responses. No other card requires this protocol as a prerequisite, and no backlog card must ship first.

## Effort rationale

Medium. The structural diff data already exists in `graft_diff` and `graft_since` responses. The work is: (a) designing a clean, extensible response schema with deep links, (b) updating the tool handlers to emit it, (c) ensuring backward compatibility for clients that expect the current text format, and (d) testing with at least one real MCP client. The schema design is the hardest part — it needs to be general enough for adoption beyond Graft but specific enough to be useful.
