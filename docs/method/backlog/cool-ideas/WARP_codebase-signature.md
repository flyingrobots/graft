---
title: "Codebase signature (multi-axis observer vector)"
legend: WARP
lane: cool-ideas
effort: L
blocked_by:
  - CORE_lagrangian-policy
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Structural churn data via WARP aggregate queries (backlog — v0.7.0)"
  - "Lagrangian policy framework (backlog)"
acceptance_criteria:
  - "Each file/module has a multi-component signature vector: structural complexity, change velocity, coupling surface, export stability"
  - "The signature replaces single-threshold policy with multi-axis characterization"
  - "An agent can query 'what kind of attention does this file need?' and receive the vector"
  - "No single scalar is used as a complete invariant of observer behavior"
  - "A test verifies that two files with different structural profiles produce distinct signature vectors"
---

# Codebase signature (multi-axis observer vector)

Replace single-threshold policy with a multi-component vector per
file/module: structural complexity, change velocity, coupling
surface, export stability.

Instead of "how big is this file?" the agent asks "what KIND of
attention does this file need?"

No single scalar is a complete invariant of observer behavior
(OG-I No-Scalarization Theorem). The signature IS the observer
characterization.

## Implementation path

1. Define the `CodebaseSignature` type: a vector with named axes
   (structural complexity, change velocity, coupling surface, export
   stability) and per-axis computation strategy.
2. **Structural complexity axis**: derive from `file_outline` —
   symbol count, nesting depth, export count. Shipped infrastructure.
3. **Change velocity axis**: derive from WARP commit→sym edges —
   how frequently does this file's symbols appear in `changes` edges
   over recent commits. Requires WARP aggregate queries (v0.7.0
   backlog).
4. **Coupling surface axis**: derive from `code_refs` — count
   incoming and outgoing reference edges per file. Shipped
   infrastructure.
5. **Export stability axis**: derive from export-surface-diff —
   how often do exported signatures change vs. stay stable. Requires
   historical analysis over WARP worldline.
6. Expose as an MCP tool (`codebase_signature`) that returns the
   vector for a given file or directory.
7. Wire into the Lagrangian policy engine so the signature vector
   feeds the policy's multi-axis cost functional.

## Why blocked by CORE_lagrangian-policy

The codebase signature is a multi-axis characterization whose
primary consumer is multi-axis policy. Without the Lagrangian
policy engine, the signature is interesting data but has no
decision-making consumer — the current dual-threshold policy
cannot consume a vector. The Lagrangian provides the framework
that makes signatures actionable. Building the signature without
its consumer would be effort without leverage.

## Related cards

- **CORE_lagrangian-policy** (blocked_by — hard dep): The
  Lagrangian policy engine consumes signature vectors as input
  axes. The signature is the data; the Lagrangian is the decision
  engine. See above.
- **WARP_codebase-entropy-trajectory**: Entropy trajectory tracks
  aggregate trends over time; the signature characterizes individual
  files at a point in time. Different granularity and purpose. The
  change velocity axis of the signature could share computation
  with entropy metrics, but neither requires the other.
- **CORE_self-tuning-governor**: Self-tuning suggests threshold
  adjustments based on metrics. The signature provides richer
  per-file characterization that could improve tuning quality.
  Nice-to-have, not a hard dependency.
- **WARP_symbol-heatmap**: Heatmap tracks observation frequency;
  signature tracks structural properties. Complementary signals
  about file importance. Independent implementations.

## Effort rationale

Large. Each axis requires its own computation strategy and data
source. Change velocity and export stability require walking the
WARP worldline across commits — non-trivial aggregation. The
vector representation needs design (normalization, weighting,
comparison semantics). Integration with the Lagrangian policy
adds further surface. The individual axes are M each; composing
them into a coherent vector with policy integration pushes to L.
