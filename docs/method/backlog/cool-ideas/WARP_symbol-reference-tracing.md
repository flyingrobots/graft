# Symbol reference tracing

Inverse of `code_show`: given a symbol, show the files or symbols that
depend on it.

Prompted by external dogfood feedback:
- "What depends on this?"
- given a symbol, show every file that imports or references it

Potential value:
- impact analysis before edits
- targeted review context
- better structural debugging than raw grep
- a path toward dependency-aware WARP history

Questions:
- should this be file-level, symbol-level, or both?
- can Level 1 live parsing support a useful first version before WARP
  persists it?
- how should uncertain or dynamic references be represented?

Why cool:
- it fits Graft's structural posture naturally
- it complements `code_show`, `code_find`, and `graft_diff`

Effort: L
