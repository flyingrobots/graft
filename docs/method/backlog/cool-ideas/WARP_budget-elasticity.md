---
title: "Budget elasticity (progressive disclosure hints)"
feature: policy
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "Outline extraction (shipped)"
  - "Compression ratio tracking (shipped)"
  - "Tree-sitter AST parsing (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Outline responses include per-symbol elasticity annotations indicating marginal understanding gain from deeper reading"
  - "High-elasticity symbols (reading more resolves significant ambiguity) are distinguished from low-elasticity ones"
  - "Elasticity values are derived from structural properties, not arbitrary thresholds"
  - "An agent can use elasticity to prioritize which symbols to read next within a budget"
  - "A test verifies that a structurally complex function has higher elasticity than a trivial getter"
---

# Budget elasticity (progressive disclosure hints)

When graft returns an outline, annotate with elasticity: how
much understanding does additional reading BUY?

"Reading 40 more lines of processEvent resolves 80% of the
structural ambiguity."

vs.

"Reading the full 2000-line file adds <5% understanding beyond
the outline."

This tells the agent WHERE additional reading investment has the
highest return. Not just "you can't read this" but "here is the
most efficient next read."

See: OG-I (budget elasticity as semantic recovery per resource).

## Implementation path

1. Define elasticity as a per-symbol metric: the ratio of structural
   information hidden by the outline to the cost (in tokens/lines)
   of revealing it. High elasticity = reading the body resolves
   significant ambiguity. Low elasticity = the signature tells you
   everything.
2. Compute structural properties per symbol from the AST: control
   flow complexity (branching depth, loop nesting), number of local
   variables, number of internal calls, body length. These proxy for
   "how much is hidden by the outline."
3. Normalize elasticity to a scale (e.g., 0.0-1.0) where 1.0 means
   "the outline hides nearly everything" and 0.0 means "the outline
   is the full story."
4. Annotate outline output: add an elasticity indicator per symbol
   (e.g., a tag or a compact annotation). Keep the annotation format
   compact — agents should parse it easily without it bloating the
   outline.
5. Add a filtering/sorting option: agents can request "show me the
   top-N highest elasticity symbols" to prioritize their reading
   budget.
6. Test with known patterns: a getter (low elasticity), a complex
   state machine function (high elasticity), a simple constructor
   (low), a function with extensive branching (high).

## Related cards

- **WARP_degeneracy-warning**: Degeneracy measures how much the
  outline collapses distinct behaviors (conditional entropy).
  Elasticity measures the marginal understanding gain from reading
  deeper. They share the insight that "outlines hide information"
  but answer different questions: degeneracy says "be careful, the
  outline is misleading," elasticity says "reading this body is
  worth the cost." Not a hard dependency — elasticity can be
  computed from structural properties alone without degeneracy
  metrics.
- **WARP_adaptive-projection-selection**: Adaptive projection
  selects the best view type for a file. Elasticity annotates
  within a view. They operate at different granularities (file-level
  vs. symbol-level) and compose naturally. Not a hard dependency.
- **WARP_projection-safety-classes**: Safety classes warn when a
  projection cannot answer a question. Elasticity hints at where
  deeper reading is most valuable. Complementary signals — one is
  a warning, the other is guidance. Not a hard dependency.
- **CORE_speculative-read-cost**: Read cost tells the agent how
  much a read would cost. Elasticity tells the agent how much
  understanding that cost would buy. They pair naturally as
  cost/benefit, but neither requires the other.
- **CORE_horizon-of-readability**: Horizon detects when no
  projection reduces complexity. Elasticity measures per-symbol
  marginal gain. At the horizon, all symbols would have high
  elasticity (everything is hidden). Related concepts but
  independent implementations.

## No dependency edges

All hard prerequisites (outline extraction, compression ratio,
tree-sitter) are shipped. "Structural complexity metrics" is
internal work for this card — computing AST-derived properties
per symbol — not a separate card that must ship first. No other
card is blocked waiting for budget elasticity, and no other card
is required as a prerequisite.

## Effort rationale

Medium. The conceptual design (elasticity as marginal understanding
gain) is clear, and the structural inputs are available from the
shipped tree-sitter infrastructure. The main work is: (a) defining
the elasticity formula and calibrating it across diverse code
patterns, (b) integrating annotations into the outline output
format without bloating it, and (c) testing that the metric is
meaningful (not just correlated with line count). Not L because
the scope is bounded — one metric, one annotation point, one
output format.
