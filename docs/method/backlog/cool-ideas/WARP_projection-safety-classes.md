---
title: "Projection safety classes"
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "Outline extraction (shipped)"
  - "Budget governor with projection decisions (shipped)"
  - "Tree-sitter AST parsing (shipped)"
acceptance_criteria:
  - "Each projection level (outline, signature, content) has a declared set of question classes it can safely answer"
  - "When an agent asks a question that exceeds the current projection's safety class, graft emits a warning with the required projection level"
  - "The structural insufficiency floor is computed per query: questions below the floor are guaranteed unanswerable at the current aperture"
  - "Safety class metadata is available programmatically for tool integrations"
---

# Projection safety classes

Classify what kinds of questions each projection can safely answer.

"Is there a function called handleError?" — safe under outline.
"Does handleError actually handle all error cases?" — unsafe,
requires content-level reading.

When an agent asks a question that its current projection cannot
reliably answer, graft warns: "Your current view cannot answer
this. You need to read_range lines 42-80."

Below a certain aperture, an observer is GUARANTEED to miss
truths (the structural insufficiency floor from OG-III). Graft
should know this boundary and enforce it.

See: OG-III (truth transport under coarsening).

## Implementation path

1. Define question classes: existence ("does symbol X exist?"),
   signature ("what are the parameters?"), behavior ("what does it
   do?"), control flow ("what branches exist?"), side effects ("does
   it mutate state?"). Map each class to the minimum projection that
   can answer it.
2. Build a question classifier: given a tool call and its parameters,
   infer the question class. For example, `code_find` implies
   existence; `code_show` on a specific symbol implies behavior;
   `file_outline` implies structure.
3. Implement the safety check: compare the inferred question class
   against the projection that would be (or was) applied. If the
   projection is insufficient, emit a structured warning with the
   required projection and a suggested tool call.
4. Compute the structural insufficiency floor per file: the minimum
   projection level at which any behavioral question can be answered.
   For files where outline is nearly identical to content (low
   compression ratio), the floor is low. For files with many dense
   functions, the floor is high.
5. Expose safety class metadata via a programmatic API so external
   tool integrations can query it without triggering a read.
6. Integrate with the policy engine: safety warnings flow alongside
   projection decisions, not as a separate channel.

## Related cards

- **WARP_adaptive-projection-selection**: Adaptive selection chooses
  the best projection for a file. Safety classes warn when any
  chosen projection is insufficient for the question being asked.
  They compose: adaptive selection picks the best default, safety
  classes catch cases where even the best default is not enough.
  Not a hard dependency — safety classes work regardless of how the
  projection was selected (manually or adaptively).
- **WARP_budget-elasticity**: Elasticity measures per-symbol
  marginal understanding gain. Safety classes define per-question
  minimum projection requirements. Different dimensions of the same
  "is the current view sufficient?" question. Elasticity is
  quantitative (how much more would I learn?); safety classes are
  categorical (can I answer this at all?). Not a hard dependency.
- **WARP_degeneracy-warning**: Degeneracy warns that the outline
  hides behavioral differences. Safety classes warn that the
  projection cannot answer a specific question. Degeneracy is a
  property of the symbol; safety class violations are a property of
  the question-projection pair. Related signals, independent
  implementations.
- **CORE_horizon-of-readability**: Horizon detects when no
  projection reduces complexity. Safety classes detect when a
  specific projection is insufficient for a specific question.
  Horizon is file-level; safety is question-level. Not a hard
  dependency.
- **WARP_session-filtration**: Filtration adapts projection detail
  based on accumulated knowledge. Safety classes could account for
  filtration state (if the agent has already read the content, the
  safety class for behavioral questions is satisfied). Complementary
  but not dependent.

## No dependency edges

The original card lists "task-aware projection (backlog)" as a
requirement. On analysis: task-aware projection is the ability to
select projections based on task context, which is essentially
what WARP_adaptive-projection-selection provides. However, safety
classes do NOT require task-aware projection — they operate on any
projection (manually or automatically selected) and check whether
it is sufficient for the inferred question class. The question
classifier can infer question classes from tool call parameters
alone, without needing task-aware projection infrastructure. All
hard prerequisites (outline extraction, budget governor, tree-sitter)
are shipped. No other card must ship first.

## Effort rationale

Medium. The question class taxonomy is the key design challenge —
it must be comprehensive enough to catch real insufficiency but not
so granular that it produces noisy false warnings. The question
classifier needs heuristics that are reliable across diverse agent
workflows. The safety check integration with the policy engine is
straightforward. Not L because the scope is bounded (finite set of
question classes, finite set of projections) and the output is a
simple warning, not a complex system.
