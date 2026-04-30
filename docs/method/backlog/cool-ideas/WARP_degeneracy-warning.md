---
title: "Degeneracy warning"
feature: agent-safety
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "Outline extraction (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Outline responses flag symbols where the projection is degenerate (hides important behavioral differences)"
  - "Degeneracy is quantified as conditional entropy H(History | Observer Output)"
  - "Symbols with high degeneracy include an explicit warning to read deeper before deciding"
  - "Methods with identical signatures but vastly different control flow complexity are flagged"
  - "A test verifies that two methods with matching signatures but 10x complexity difference produce a degeneracy warning"
---

# Degeneracy warning

When graft returns an outline, flag symbols where the projection
is degenerate — where the structural summary hides important
behavioral differences.

"Two methods share identical signatures but differ in control
flow complexity by 10x. This outline has high degeneracy."

The agent is told: your current view collapses distinctions that
matter. Read deeper before deciding.

Degeneracy = conditional entropy H(History | Observer Output).
Higher values = more collapsed ambiguity.

Depends on: outline extraction (shipped), structural complexity
metrics.

See: OG-I (degeneracy as dual of aperture).

## Implementation path

1. Define structural complexity metrics per symbol: control flow
   complexity (branch count, loop depth, exception paths), body
   size (lines, AST node count), and call-graph fan-out. These
   metrics require tree-sitter AST analysis beyond the current
   outline extraction (which captures signatures but not body
   complexity).
2. Compute degeneracy score: for each symbol in an outline, compare
   the information content of the outline representation (signature,
   kind, exported status) against the full structural complexity.
   High ratio = high degeneracy. Formalize as conditional entropy
   H(full structure | outline representation).
3. Set a degeneracy threshold: symbols above the threshold get
   flagged in outline responses. The threshold should be calibrated
   empirically — start with "body complexity 10x above median for
   symbols with similar signatures."
4. Annotate outline output: add a degeneracy indicator to flagged
   symbols. The annotation tells the agent what kind of complexity
   is hidden (e.g., "complex control flow", "high fan-out",
   "deep nesting") and suggests reading deeper.
5. Wire into the governor: when an agent is about to make a decision
   that touches a degenerate symbol (detected via observation
   cache), the governor can proactively suggest a deeper read.

## Related cards

- **WARP_intentional-degeneracy-privacy**: Intentional degeneracy
  deliberately injects high degeneracy for security purposes. This
  card detects and warns about *unintentional* degeneracy. They
  share the degeneracy concept but have opposite goals: this card
  reduces surprise from hidden complexity, that card deliberately
  creates it. Not a hard dep in either direction — each can be
  built independently.
- **CORE_horizon-of-readability**: The horizon detects when no
  projection can reduce complexity further (the entire file is
  irreducibly complex). Degeneracy warning detects when a
  *specific symbol* within a projection hides disproportionate
  complexity. Different granularity: file-level vs. symbol-level.
  Complementary but independent.
- **WARP_adaptive-projection-selection**: Adaptive projection
  selects the best projection to minimize structural curvature.
  Degeneracy warnings provide a signal that adaptive projection
  could consume (high degeneracy = current projection is
  inadequate, switch to a finer one). Complementary input, not
  a hard dep.
- **WARP_projection-safety-classes**: Safety classes categorize
  what questions a projection can safely answer. Degeneracy
  warnings flag specific symbols where the current projection
  cannot safely answer complexity questions. Related but
  independent — safety classes are per-projection, degeneracy
  is per-symbol.

## No dependency edges

All prerequisites for the core feature are shipped (outline
extraction). Structural complexity metrics are listed as a backlog
requirement but could be implemented inline as part of this card
(tree-sitter complexity analysis). No other card is blocked waiting
for degeneracy warnings, and no other card must ship first.

## Effort rationale

Medium. The main work is defining and computing structural
complexity metrics per symbol (tree-sitter AST analysis for control
flow complexity, body size, fan-out). The degeneracy score
computation is a ratio — not algorithmically hard but needs
empirical calibration. Outline annotation is straightforward. M,
not L, because the scope is bounded (one new metric per symbol,
one annotation in outline output) and builds on existing tree-sitter
infrastructure. M, not S, because the complexity metrics require
meaningful AST analysis beyond what outline extraction currently
does.
