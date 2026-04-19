---
title: "Multi-interpretation tools"
---

# Multi-interpretation tools

code_show focuses on a symbol. That focus is an optic. The same
optic could drive five different tools:

1. Show source (read interpretation)
2. Rename symbol (rewrite interpretation)
3. Estimate change cost (cost annotation)
4. Check for conflicts (overlap analysis)
5. Explain provenance (debugger interpretation)

One structural focus, many interpretations. The profunctor form
means you define the focus ONCE and instantiate it for each use.

No reimplementation. No redundant code. The optic IS the
abstraction.

Depends on: WARP optics (backlog), code_show (cycle 0024).

See: aion-paper-07/optics/warp-optic.tex (Section 3)
