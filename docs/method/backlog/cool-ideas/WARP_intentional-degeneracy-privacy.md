---
title: "Intentional degeneracy for agent safety"
feature: agent-safety
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "Policy engine (shipped)"
  - "Outline extraction (shipped)"
acceptance_criteria:
  - "Security-sensitive code regions can be tagged with a degeneracy policy"
  - "Tagged regions return structurally accurate but semantically opaque summaries (e.g., module purpose without implementation)"
  - "An agent reading a degenerate region cannot reconstruct credential values or security-critical logic"
  - "The outline for a degenerate region is honest about exported symbols and types but omits implementation bodies"
  - "Policy violations (attempts to bypass degeneracy via read_range) are blocked and logged"
---

# Intentional degeneracy for agent safety

Privacy is intentional injection of structural degeneracy
(OG-V). Some code regions (security-sensitive, credentials-
adjacent) should have intentionally high degeneracy.

Rather than banning reads entirely, return structurally accurate
but semantically opaque summaries: "This module handles
authentication" without revealing implementation details that
could be exfiltrated through the agent's context window.

This is a middle ground between full access and full refusal.
The outline is HONEST about structure but OPAQUE about
implementation. Controlled information hiding, not access denial.

Depends on: policy engine (shipped), outline extraction (shipped).

See: OG-V (privacy as intentional degeneracy).

## Implementation path

1. Define the degeneracy policy schema: a configuration in
   `.graftrc` or `.graft/privacy.yaml` that marks file paths,
   directory globs, or symbol patterns as security-sensitive.
   Each entry specifies the degeneracy level (e.g., "signature-only",
   "module-summary", "type-stubs-only").
2. Modify outline extraction to respect degeneracy policies: when
   a file matches a degeneracy policy, the outline includes
   exported symbols, types, and function signatures but omits
   implementation bodies, inline comments, and string literals.
3. Modify read_range and code_show to enforce degeneracy: attempts
   to read implementation details of a degenerate region are blocked
   by the policy engine. The refusal message explains that the
   region is privacy-protected and provides the available
   structural summary instead.
4. Log policy enforcement: every blocked read attempt is recorded
   in the governor receipts with the policy that triggered it,
   the file/symbol targeted, and the agent ID.
5. Implement the "honest but opaque" contract: the degenerate
   outline must not lie about what exists (no fake symbols, no
   hidden exports). It omits HOW things work, not WHAT exists.
   This means type signatures, export lists, and module purpose
   are always visible.

## Related cards

- **WARP_degeneracy-warning**: Degeneracy warning detects and
  flags *unintentional* degeneracy (where the projection hides
  important complexity the agent should know about). This card
  *intentionally creates* degeneracy for security purposes. They
  share the degeneracy concept from OG theory but have opposite
  goals. Not a hard dep in either direction.
- **CORE_policy-profiles**: Policy profiles define named
  configuration bundles (balanced, strict, feral). Degeneracy
  policies could be included in profile definitions (strict
  profile has broader degeneracy regions). Complementary
  configuration surface, not a hard dep.
- **WARP_projection-safety-classes**: Safety classes define what
  questions a projection can answer. Intentional degeneracy
  constrains what questions are ALLOWED to be answered, regardless
  of projection capability. Different axis: capability vs.
  permission. Independent.
- **WARP_adaptive-projection-selection**: Adaptive projection
  selects the best projection for a task. Degeneracy policies
  constrain which projections are available for sensitive regions.
  The policy engine mediates — adaptive projection proposes,
  degeneracy policy vetoes. Independent implementation.

## No dependency edges

All prerequisites are shipped (policy engine, outline extraction).
No other card must ship first. No other card is blocked waiting
for this. The degeneracy warning card is thematically related but
architecturally independent.

## Effort rationale

Medium. The policy schema design and configuration surface are
bounded work. Modifying outline extraction to respect policies
requires careful filtering (omit bodies but keep signatures) —
tree-sitter already provides this granularity. The harder part is
the enforcement in read_range and code_show: every read path must
check the policy engine, and refusals must be informative rather
than opaque. Logging is straightforward (extends governor
receipts). M, not S, because enforcement touches multiple tool
paths and must be watertight (no bypass routes). M, not L, because
the policy engine infrastructure already exists and the outline
filtering is well-defined.
