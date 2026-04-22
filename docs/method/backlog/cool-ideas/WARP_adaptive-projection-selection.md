---
title: "Adaptive projection selection"
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Outline projection (shipped)"
  - "Content, range, diff, and map projections (shipped)"
  - "Budget governor with projection decisions (shipped)"
  - "Structural complexity metrics (backlog)"
acceptance_criteria:
  - "Given a file and task context, the system selects the projection that minimizes structural curvature"
  - "Dense utility files default to outline; thin config files default to content"
  - "Single-function investigation defaults to range; version comparison defaults to diff"
  - "Projection selection is structural (graph-derived), not threshold-based"
  - "The selected projection can be overridden by an explicit user/agent request"
  - "A test verifies that a high-complexity file selects outline over content"
---

# Adaptive projection selection

Graft's outline projection is not convenience — it is a
representation change that collapses computational complexity
(NP collapse from AION Paper 10).

The WARP graph could auto-detect which projection minimizes
structural curvature for the agent's current task and select it
automatically.

- Reading a dense utility file? Outline.
- Reading a thin config file? Content.
- Investigating a bug in one function? Range.
- Comparing two versions? Diff.
- Exploring a new codebase? Map.

The choice should be structural, not threshold-based. The WARP
graph knows the curvature. Graft picks the geodesic.

## Implementation path

1. Define a projection scoring function: given a file's structural
   properties (symbol count, AST depth, compression ratio, line count)
   and the agent's task context (recent tool calls, session state),
   compute a score for each available projection (outline, content,
   range, diff, map).
2. Build structural complexity metrics: symbol density (symbols per
   line), control flow depth, fan-in/fan-out from reference edges.
   These feed the scoring function.
3. Implement task-context inference: use the observation cache to
   determine what the agent is doing — exploring (map), drilling
   (range), comparing (diff), surveying (outline).
4. Wire the scoring function into the policy engine as an alternative
   to the current threshold-based projection decision. The policy
   engine calls the scorer, the scorer returns the optimal projection.
5. Add an override mechanism: explicit `projection: "content"` on a
   tool call bypasses the adaptive selector.
6. Validate with test cases: high-complexity utility file selects
   outline, thin config selects content, file containing a single
   target symbol selects range.

## Related cards

- **WARP_projection-safety-classes**: Safety classes define what
  questions each projection can answer. Adaptive selection chooses
  the best projection; safety classes warn when the chosen projection
  is insufficient for the question being asked. Complementary but
  independent — adaptive selection works without safety classes
  (it picks the best default), and safety classes work without
  adaptive selection (they warn regardless of how the projection was
  chosen). Not a hard dependency.
- **WARP_budget-elasticity**: Budget elasticity annotates symbols
  with marginal understanding gain. Adaptive projection selects the
  view; elasticity annotates within that view. Independent axes.
- **CORE_horizon-of-readability**: Horizon of readability detects
  when no projection can reduce complexity further. Adaptive
  selection picks the best available projection; horizon detection
  says "none of them help." Complementary boundary conditions.
  Not a hard dependency — adaptive selection can operate without
  knowing the horizon, and horizon detection works independently.
- **CORE_auto-focus**: Auto-focus narrows to a specific symbol
  within a file based on intent. Adaptive projection selects the
  view type for the whole file. Different granularity — auto-focus
  is symbol-level, adaptive projection is file-level. Independent.
- **WARP_session-filtration**: Filtration adapts detail level based
  on accumulated knowledge. Adaptive projection selects the view
  type based on structural properties. They could compose (filtration
  adjusts within the adaptively selected projection) but neither
  requires the other.
- **CORE_policy-profiles**: Profiles set the governor envelope;
  adaptive projection operates within that envelope. Independent
  axes — profiles don't dictate projection selection logic.

## No dependency edges

The card body mentions "refactor difficulty score" and "horizon of
readability" as dependencies. On analysis: refactor difficulty score
provides per-symbol curvature/friction, which would enrich the
scoring function but is not required — the scoring function can
use simpler structural metrics (symbol density, compression ratio,
AST depth) that are derivable from shipped infrastructure. Horizon
of readability is a complementary boundary condition, not a
prerequisite. All hard prerequisites (WARP Level 1, projections,
budget governor) are shipped. The unshipped "structural complexity
metrics" is work internal to this card, not a separate card.

## Effort rationale

Large. The core challenge is designing a scoring function that
reliably outperforms the current threshold-based approach across
diverse codebases. This requires: (a) structural complexity metrics
that are meaningful (not just line count), (b) task-context inference
from session history, (c) integration with the policy engine without
breaking existing behavior, and (d) extensive validation that the
adaptive choices are actually better than defaults. The scoring
function design is an open research question — getting it wrong
means the system makes worse choices than the simple threshold.
