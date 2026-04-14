---
title: Buffer-aware syntax spans for jedit source highlighting
legend: SURFACE
lane: graveyard
---

# Buffer-aware syntax spans for jedit source highlighting

## Disposition

Implemented via the direct StructuredBuffer syntaxSpans() surface with viewport filtering and stable span classes for editor highlighting.

## Original Proposal

Requested by `jedit`, a terminal-first editor that already uses Graft MCP for contextual drawers and now wants truthful AST-backed source colorization in the editor pane.

Context:
- `jedit` can already paint per-cell colors in the terminal.
- Current Graft surfaces such as `file_outline` and `code_show` are structural, not token/span oriented.
- On-disk-only parsing is not enough because `jedit` needs dirty unsaved buffers to highlight truthfully.

Need:
- Add a bounded syntax/semantic span surface for `path` plus optional in-memory `content`.
- Return line/column spans with a small stable class vocabulary (`keyword`, `string`, `comment`, `type`, `function`, etc.).
- Support range-limited queries so `jedit` can ask only for the visible viewport.
