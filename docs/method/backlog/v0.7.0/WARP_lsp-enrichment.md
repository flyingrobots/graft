---
title: "LSP enrichment layer for WARP graph"
legend: WARP
lane: v0.7.0
requirements:
  - "indexHead pipeline (shipped)"
  - "Tree-sitter parsing pipeline (shipped)"
  - "tsserver available in project"
acceptance_criteria:
  - "indexHead emits LSP-derived semantic edges (calls, extends, implements)"
  - "Resolved types appear as properties on sym nodes"
  - "All enrichment happens in one atomic WARP patch alongside AST nodes"
---

# LSP enrichment layer for WARP graph

Source: symbol-reference-tracing cycle discussion (2026-04-20)

Add tsserver-based semantic enrichment to `indexHead`. Same atomic patch,
same graph — just richer edges and properties that tree-sitter can't provide.

## What LSP adds

- `calls` edges — type-resolved function call relationships
- `extends` / `implements` edges — class hierarchy
- `typeof` properties — resolved types (even inferred, no annotation)
- Accurate module resolution — tsconfig paths, baseUrl, path aliases
- Overload resolution — which specific overload is being called
- Re-export chain following — through barrel files

## Model

Run tsserver on HEAD alongside tree-sitter. Emit everything in the
same `warp.patch()` call — one atomic snapshot. No two-pass enrichment.

## Approach

1. Start tsserver with the project's tsconfig
2. For each file, request references/definitions/types from the LSP
3. Emit semantic edges alongside the AST nodes in the same patch
4. Shut down tsserver

The tree-sitter pass gives structure. The LSP pass gives semantics.
Both go into one tick.

Effort: L
