# Invariant: Unsupported Files Degrade Lawfully

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

Unsupported languages/files may produce file-layer facts but must
not fabricate symbol-layer facts.

## Why it matters

Graceful degradation means honest degradation. A file without a
tree-sitter parser (markdown, YAML, images) gets a `file:` node
recording its existence and change status. It does NOT get fake
symbol nodes. An empty symbol projection is honest. A fabricated
structure is a lie.

## How to check

- Unsupported files appear as `file:` nodes in the graph
- No `sym:` nodes are emitted without a parser-backed extraction
- Change status remains observable at file scope
- Test: index a commit with markdown/YAML changes, verify file
  nodes exist but no symbol nodes
