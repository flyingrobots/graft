---
title: "Python structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 10
effort: S
acceptance_criteria:
  - "`.py` and `.pyi` files are detected as parser-backed structured formats"
  - "Outlines include functions, async functions, classes, public methods, class fields, and uppercase module constants"
  - "Python outlines include jump-table entries and participate in structural diff and WARP indexing"
  - "Invalid Python files return bounded partial outlines instead of throwing"
  - "Fixtures cover realistic Python service code, not only toy snippets"
---

# Python structural parsing

Add Python as the first language-breadth expansion beyond the current
JavaScript, TypeScript, Rust, GraphQL, and Markdown coverage.

Python has the highest near-term reach for Graft: AI/ML repos, data
tooling, backend services, automation scripts, and agent frameworks all
benefit from bounded structural reads.

## First slice

- Detect `.py` and `.pyi`
- Load the bundled `tree-sitter-python.wasm`
- Extract module-level functions, async functions, classes, public class
  methods, class fields, and uppercase module constants
- Preserve structural diff and WARP indexing behavior through the shared
  parser pipeline

## Implementation status

Pulled into `cycle/CORE_structural-test-coverage-map` as the first
language-breadth trial.
