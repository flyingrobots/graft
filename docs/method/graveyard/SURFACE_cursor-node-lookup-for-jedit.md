---
title: Cursor node lookup for jedit
legend: SURFACE
lane: graveyard
---

# Cursor node lookup for jedit

## Disposition

Implemented via the direct StructuredBuffer nodeAt() surface with bounded parent-chain context for cursor-aware editor UI.

## Original Proposal

Requested by `jedit`.

Context:
- `jedit` wants cursor-aware footer/context, future semantic text objects, and AST-aware navigation.
- The missing primitive is a direct way to ask Graft what syntax node is under the cursor in the current buffer.

Need:
- Add a `node_at`-style surface that accepts `path`, optional `content`, and `line`/`column`.
- Return the smallest relevant node plus parent chain.
- Keep the payload bounded and stable enough for live editor use.
