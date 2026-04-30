---
title: "Structural impact prediction"
feature: speculative
kind: trunk
legend: WARP
lane: cool-ideas
effort: XL
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Cross-file reference edges (shipped)"
  - "Counterfactual refactoring engine (backlog)"
  - "git-warp Strands (backlog)"
acceptance_criteria:
  - "Given a proposed signature change, predicts all downstream symbols that would break"
  - "Blast radius is computed from structural dependency edges, not text grep"
  - "Speculative patches can be applied to a forked worldline to see incompatibilities without modifying code"
  - "Prediction includes the specific nature of each break (missing parameter, type mismatch, removed dependency)"
blocked_by:
  - WARP_counterfactual-refactoring
---

# Structural impact prediction

"If I change this function's signature, what else breaks?"

WARP knows every symbol that references the target via structural
edges. Predict blast radius BEFORE writing code. Apply a
speculative patch to a forked worldline, see which downstream
symbols become incompatible.

Not grep — structural dependency analysis with temporal awareness.

## Implementation path

1. Accept a proposed change as input: target symbol, nature of
   change (parameter added/removed, return type changed, symbol
   renamed/deleted)
2. Walk the WARP graph outward from the target symbol via
   `references` edges to find all direct dependents
3. For each dependent, determine compatibility: does the dependent's
   call site match the proposed new signature? (requires parameter-
   level analysis, not just "signature differs")
4. Recurse through transitive dependencies — a broken intermediate
   symbol may break its own dependents even if they don't directly
   reference the target
5. Fork the worldline using the counterfactual refactoring engine
   (from `WARP_counterfactual-refactoring`), apply the speculative
   patch, and verify the structural state of the forked worldline
6. Produce a blast radius report: each affected symbol, the nature
   of the incompatibility, the dependency chain from target to
   affected symbol, and severity (direct break vs. transitive)

## Why blocked by counterfactual-refactoring

The card's core promise — "apply a speculative patch to a forked
worldline" — requires the counterfactual execution engine from
`WARP_counterfactual-refactoring`. That card provides worldline
forking, structure-sharing (copy-on-write), and speculative patch
application. Without it, impact prediction can only do static
graph walks (which symbols *reference* the target), not dynamic
verification (which symbols actually *break*). The static version
is useful but incomplete — it cannot detect transitive breaks or
verify compatibility. **Hard dependency** for the full feature.

Note: a reduced version (graph-walk-only, no speculative patches)
could ship without counterfactual-refactoring. But the acceptance
criteria explicitly require speculative patches, so the full card
is blocked.

## Related cards

- **WARP_counterfactual-refactoring** (blocked_by): Provides the
  worldline forking and speculative patch machinery. See above.
- **WARP_auto-breaking-change-detection**: Breaking-change
  detection answers "what DID break between releases?" while
  impact prediction answers "what WOULD break if I made this
  change?" Retrospective vs. speculative. They share the concept
  of signature incompatibility analysis but have independent
  implementations. Not a dependency.
- **WARP_refactor-difficulty-score** (v0.7.0): Difficulty score is
  a scalar metric (curvature × friction). Impact prediction is a
  detailed blast radius report. The difficulty score could use
  impact prediction data as an input signal (fan-out from blast
  radius), but it currently computes from churn and edge counts
  directly. Not a hard dependency.
- **WARP_semantic-merge-conflict-prediction**: Both predict
  structural incompatibility, but merge conflict prediction
  compares branches while impact prediction evaluates a proposed
  single-symbol change. Different inputs, similar analysis.
  Not a dependency.

## Effort rationale

XL. This card depends on `WARP_counterfactual-refactoring` (itself
XL), and adds: parameter-level compatibility analysis (not just
"signature changed" but "is this call site still valid?"),
transitive dependency resolution (a break can cascade through
multiple layers), and a forked-worldline verification pass. The
compatibility analysis alone is language-specific and complex
(TypeScript parameter optionality, default values, rest parameters).
The transitive resolution needs cycle detection and depth limits.
XL is warranted.
