---
title: "Go structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 11
effort: S
acceptance_criteria:
  - "`.go` files are detected as parser-backed structured formats"
  - "Outlines include package declarations, functions, methods, structs, interfaces, const blocks, and var blocks"
  - "Receiver methods are associated with their receiver type when possible"
  - "Fixtures cover a small CLI or service package with interfaces and receiver methods"
---

# Go structural parsing

Add structural outlines for Go repositories: platform tools, CLIs,
Kubernetes-adjacent services, and infrastructure projects.

## First slice

- Detect `.go`
- Load `tree-sitter-go.wasm`
- Extract package-level functions, receiver methods, structs,
  interfaces, constants, and variables
- Use public/private naming as exported evidence where practical

## Implementation status

Pulled into `cycle/CORE_structural-test-coverage-map` after the Python
language-breadth trial.
