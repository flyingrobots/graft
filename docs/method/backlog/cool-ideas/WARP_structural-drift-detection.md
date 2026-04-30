---
title: "Structural drift detection"
feature: docs-integrity
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Docs-match-code invariant (shipped)"
acceptance_criteria:
  - "Compares structural facts stated in docs against the actual WARP graph and detects divergence"
  - "Detects invariant violations (e.g., 'no direct getNodes calls in src/') by walking the WARP graph"
  - "Detects method-level drift (e.g., BEARING says direction is WARP Level 2 but no Level 2 work has been committed)"
  - "Produces a structured report of all detected drift with file locations and expected vs. actual values"
---

# Structural drift detection

"Does the code still match what the docs say?"

Compare structural facts in docs (README says 12 tools, VISION
says 417 tests) against the actual WARP graph. Detect when
documentation drifts from reality.

Also: invariant drift. "The observer-only-access invariant says
no direct getNodes calls in src/. Does the code still comply?"
Walk the WARP graph and the source to verify.

Method-level: "BEARING says the direction is WARP Level 2. Has
any WARP Level 2 work actually been committed?" Check the
worldline for commit→symbol edges tagged with Level 2 work.

## Implementation path

1. Define a drift-rule schema: each rule specifies a doc file, a
   claim pattern (numeric assertion, invariant, method-level
   direction), and a verification strategy (WARP query, file count,
   grep, symbol check)
2. Build a rule engine that evaluates each drift rule against the
   current WARP graph and filesystem state
3. Implement built-in rule types:
   - **Numeric claims**: parse "N tools" / "N tests" patterns in
     docs, compare against reality (tool registry length, test
     runner output)
   - **Invariant compliance**: parse invariant declarations (e.g.,
     "no X calls in Y"), translate to WARP graph queries or
     code_find searches
   - **Method-level direction**: parse BEARING/METHOD direction
     claims, verify against recent commit→sym edges
4. Produce structured output: file, line, claim, expected value,
   actual value, severity
5. Support custom rules via `.graft/drift-rules.yaml` for
   project-specific invariants

## Related cards

- **WARP_stale-docs-checker**: Stale-docs-checker focuses on
  *symbol-level* drift (does the symbol still exist with the
  documented signature?). Structural-drift-detection focuses on
  *architectural and factual* drift (do numeric claims match? do
  invariants hold?). They share the broad goal of "docs match code"
  but operate at different granularities. The stale-docs-checker
  could serve as a primitive for the symbol-checking subset of
  structural drift, but structural-drift-detection covers much
  more (invariants, numeric facts, method compliance) that requires
  its own verification logic. Not a hard dependency in either
  direction.
- **WARP_drift-sentinel**: The sentinel automates checks via hooks
  and monitor ticks. Structural-drift-detection could be one of
  the checks the sentinel runs, but neither requires the other to
  function. The sentinel could wire in structural-drift-detection
  as a plugin, or structural-drift-detection could run standalone.
  Not a hard dependency.
- **CORE_sludge-detector**: Sludge detector identifies friction
  patterns in agent workflows. Structural drift is one cause of
  sludge (stale docs mislead agents), but the two have different
  detection mechanisms. Not a dependency.

## No dependency edges

All prerequisites are shipped (WARP Level 1, docs-match-code
invariant). No other card is required for this to work. No other
card lists this as a prerequisite. The related cards above share
thematic territory but have independent implementations.

## Effort rationale

Medium. The rule engine design is the main work — needs to be
extensible enough for custom rules while shipping with useful
built-in rules. Each built-in rule type (numeric, invariant,
method-level) has its own parsing and verification logic. WARP
graph queries are straightforward. The structured output format
needs design. M, not L, because the scope is bounded (finite rule
types, well-defined output) and the WARP infrastructure already
exists.
