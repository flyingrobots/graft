---
title: "Minimum viable context"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - WARP_structural-impact-prediction
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "code_find (shipped)"
  - "code_refs (shipped)"
  - "Structural impact prediction (backlog)"
acceptance_criteria:
  - "Given a target symbol, the system produces the minimal set of files needed to understand and modify it"
  - "The file set is derived from structural dependency edges, not text search"
  - "Context size (in tokens) is measurably smaller than whole-repo or grep-based approaches for equivalent tasks"
  - "Agent task completion rate is not degraded when using minimum viable context vs. full repo context"
---

# Minimum viable context

Agent needs to fix function X. WARP knows the structural
dependency graph -- which symbols call X, which files contain them.

Pre-populate the agent's context with ONLY the structurally
relevant files. Not grep. Not the whole repo. The actual
dependency surface.

Minimum bytes for maximum task completion probability.

## Implementation path

1. Given a target symbol, use `code_refs` to find all structural
   references (callers, importers, type dependents).
2. Walk the reference edges to a configurable depth (direct
   callers, callers of callers, etc.) to build the dependency
   surface.
3. For each symbol in the dependency surface, resolve to file and
   line range using `code_find` / `file_outline`.
4. Rank files by structural relevance: direct references first,
   then transitive, then files that share exports with the target.
5. Apply a token budget: trim the ranked file list to fit the
   agent's context window, preferring higher-relevance files.
6. Return the minimal context set: ordered list of files with
   relevance scores and the specific symbols/ranges to focus on.

## Why blocked by structural-impact-prediction

Structural impact prediction provides the blast radius analysis:
"if this symbol changes, what breaks?" Minimum viable context
needs exactly this information to determine which files are
structurally relevant. Without impact prediction, the context set
would be based only on direct references (code_refs) without
understanding which downstream symbols would actually be affected
by a change. Impact prediction turns a flat reference list into a
ranked dependency surface.

## Related cards

- **WARP_structural-impact-prediction** (blocked_by -- hard dep):
  Provides the blast radius analysis that powers context ranking.
  See above.
- **CORE_context-budget-forecasting**: Budget forecasting predicts
  how much context an agent will need for a task. Minimum viable
  context provides the actual context set. They are complementary
  -- forecasting says "you'll need ~4K tokens," MVC says "here are
  the 4K tokens that matter." Not a hard dep because MVC can work
  with a fixed budget and forecasting can work without MVC.
- **CORE_auto-focus**: Auto-focus narrows the agent's attention
  to relevant areas. MVC narrows the initial context load. Similar
  goals but different mechanisms -- auto-focus is reactive (during
  session), MVC is proactive (at session start). Not a hard dep.
- **WARP_session-filtration**: Filtration adapts projections based
  on what the agent has already seen. MVC sets the initial context.
  Filtration could make MVC more efficient over time (show more
  detail as context accumulates) but neither blocks the other.

## Effort rationale

Medium. The core algorithm (walk reference edges, rank by
relevance, apply token budget) is straightforward given shipped
infrastructure (code_refs, code_find, file_outline). The main
complexity is in ranking heuristics and validating that the reduced
context does not degrade task completion. No new substrate features
needed -- this builds on shipped tools.
