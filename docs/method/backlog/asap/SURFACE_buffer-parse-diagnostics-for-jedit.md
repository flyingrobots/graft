---
title: "Buffer parse diagnostics for jedit"
legend: SURFACE
lane: asap
---

# Buffer parse diagnostics for jedit

Requested by `jedit`.

Context:
- `jedit` wants lightweight parser diagnostics for the current source buffer.
- This is not a request for full LSP orchestration; it is a bounded parser/structure surface that can support editor feedback and syntax-aware rendering.

Need:
- Add a diagnostics surface that accepts `path` plus optional `content`.
- Return bounded syntax/parse diagnostics with ranges and severities.
- Keep the contract fast enough for editor refresh loops.
