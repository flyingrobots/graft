---
title: "Constructor-in-disguise detection"
feature: structural-metrics
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Tree-sitter parsing (shipped)"
  - "file_outline tool (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "ast-import-resolver / references edges (shipped)"
acceptance_criteria:
  - "Functions named build*/create*/make*/assemble* that return object literals with 3+ fields are detected"
  - "Detection runs as a `graft doctor` check or as annotations on file_outline entries"
  - "When WARP data is available, the full dependency chain from constructor-in-disguise through consumers is mapped"
  - "Suggestions include the class + method structure replacement"
---

# Constructor-in-disguise detection

A `function buildFoo(...)` that returns `{ field1, field2, ... }`
is a constructor pretending to be a function. Graft can detect this
structurally:

1. Function name starts with `build`, `create`, `make`, `assemble`
2. Returns an object literal (not a class instance)
3. The returned shape has 3+ fields

Flag it: "buildFoo looks like a constructor — consider making Foo
a class."

Goes further with WARP: if the returned shape is consumed by other
functions that access its fields, those functions are behavior that
belongs on the class. Map the full dependency chain from the
constructor-in-disguise through its consumers and suggest the
class + method structure in one shot.

Could surface as a `graft doctor` check or as annotations on
`file_outline` entries.

## Implementation path

1. Add a tree-sitter query that matches functions with `build*`/`create*`/`make*`/`assemble*` names that contain a `return { ... }` statement with 3+ properties. This is a pure AST pattern match — no type system needed.
2. Wire the query into `graft doctor` as a new check. Each match produces a diagnostic with the function name, file, line, and the number of fields in the returned object.
3. For the WARP-enhanced version: use `references` edges to find call sites of the detected function, then find property accesses on the returned value. Functions that access 2+ fields of the returned object are candidates for methods on the proposed class.
4. Generate a suggestion: "Consider `class Foo` with fields `[field1, field2, ...]` and methods `[consumerA, consumerB]`." The suggestion is structural, not a code-mod — it tells the developer what to do, not how.
5. Optionally annotate `file_outline` entries for detected functions with a `[constructor-in-disguise]` badge.

## Related cards

- **WARP_dead-symbol-detection**: Dead symbol detection finds removed-and-never-re-added symbols. Constructor detection finds misclassified symbols. Both are structural analysis features that could live under `graft doctor`, but they analyze different properties. No dependency.
- **WARP_stale-docs-checker**: Stale docs checker detects documentation drift. Constructor detection detects code-structure smells. Both are doctor checks but unrelated in mechanism. No dependency.
- **CORE_sludge-detector** (v0.7.0 backlog): Sludge detector identifies code that slows agents down — convoluted structure, excessive indirection, etc. Constructor-in-disguise is a specific structural smell that sludge detection might eventually subsume. However, sludge detector operates on agent metrics (which code takes the most reads to understand?), while constructor detection operates on AST patterns. No dependency in either direction.

## No dependency edges

All prerequisites are shipped. Tree-sitter parsing, file_outline, WARP Level 1, and references edges provide everything needed. No other card requires constructor detection as a prerequisite, and no backlog card must ship first.

## Effort rationale

Medium. The tree-sitter query for the basic detection (step 1-2) is small effort. The WARP-enhanced consumer mapping (step 3-4) adds significant design surface: following reference edges through call sites, identifying property accesses on returned values, and grouping consumers into proposed methods. The consumer mapping is what pushes this from S to M — it requires walking the reference graph with semantic understanding of return-value flow.
