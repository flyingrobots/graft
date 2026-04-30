---
title: "Stale docs checker"
feature: docs-integrity
kind: trunk
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "graft_since (shipped)"
  - "Outline extraction (shipped)"
acceptance_criteria:
  - "Walks markdown files for symbol references (backtick-quoted names, code blocks) and cross-references against WARP worldline"
  - "Flags docs where referenced symbols have changed since the doc was last modified"
  - "Detects version number drift between CHANGELOG and package.json"
  - "Detects numeric claims in docs (e.g., tool count) that no longer match reality"
  - "Output includes file, line, stale reference, and the commit where the symbol changed"
blocking:
  - WARP_drift-sentinel
---

# Stale docs checker

WARP knows when symbols change. Docs reference symbols by name.
When a referenced symbol's signature changes, the doc is stale.

"README.md mentions evaluatePolicy — but its signature changed
3 commits ago. The docs may be outdated."

Walk docs for symbol references (backtick-quoted names, code
blocks). Cross-reference against WARP worldline. Flag docs
where referenced symbols have changed since the doc was last
modified.

Also: CHANGELOG mentions version numbers. Compare against
package.json. GUIDE mentions tool count. Compare against
TOOL_REGISTRY.length.

## Implementation path

1. Parse markdown files for symbol references: backtick-quoted
   identifiers, fenced code blocks with symbol names
2. For each referenced symbol, query the WARP graph to find if
   it exists and when it last changed (via commit→sym edges)
3. Compare the symbol's last-change commit timestamp against the
   doc file's last-modification timestamp
4. For version/count checks: parse specific known patterns
   (version strings, numeric claims) and compare against source

## Relationship to drift-sentinel

This card and **WARP_drift-sentinel** share a core mechanism: parse
docs for symbol refs, check against WARP, flag drift. The key
difference:

- **Stale docs checker** (this card): the **checking engine**.
  Explicit invocation, broader scope (version numbers, numeric
  claims, symbol signatures).
- **Drift sentinel**: the **integration layer**. Wraps the checker
  into pre-commit hooks and daemon monitor ticks.

Build the checker first. The sentinel wires it into automation.
**This card blocks drift-sentinel.**

## Related cards

- **WARP_structural-drift-detection**: Even broader scope — checks
  structural facts in docs (tool counts, invariants, method-level
  claims). Could use this card's symbol-checking as a primitive,
  but also covers non-symbol drift (invariant violations, method
  compliance). Not a hard dependency in either direction — the
  scopes overlap but structural-drift-detection may reimplement
  from scratch for its broader needs.

## Effort rationale

Medium. Markdown parsing for symbol references is heuristic (not
all backtick-quoted text is a symbol name). WARP cross-referencing
is straightforward once symbols are extracted. The version/count
checking requires pattern-specific logic.
