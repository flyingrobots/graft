---
title: "Temporal structural search"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - WARP_symbol-history-timeline
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Symbol history timeline (backlog)"
  - "Worldline seek API (shipped)"
acceptance_criteria:
  - "Answers temporal queries: 'when did this function first appear?', 'has this class ever had method X?'"
  - "Returns results across all of history, not just a single ref"
  - "Queries operate on structural meaning (symbol identity), not text patterns"
  - "Performance is bounded by worldline size, not raw git history size"
---

# Temporal structural search

"When did this function FIRST appear?"
"Has this class EVER had a method called handle?"
"Show me every version of this interface across the last year."

Temporal queries across structure. git grep searches text at one
ref. WARP searches meaning across all of history.

## Implementation path

1. **Symbol history timeline** (prerequisite): The timeline card
   provides per-symbol version history across commits — the
   foundational data layer for temporal queries. Without it,
   temporal search would need to build its own commit-walking
   and symbol-tracking logic.
2. Define a temporal query language (or structured API) supporting
   predicates: `first_appeared(symbol)`, `ever_had(class, method)`,
   `versions_of(symbol, time_range)`, `removed_at(symbol)`.
3. Implement each predicate by querying the symbol history timeline:
   - `first_appeared`: find the earliest `adds` edge for the symbol
   - `ever_had`: check if a `adds` or `changes` edge ever existed
     for the method within the class scope
   - `versions_of`: return the full timeline filtered by date range
   - `removed_at`: find the `removes` edge with no subsequent `adds`
4. Add a `temporal_search` MCP tool that accepts structured queries
   and returns timeline-aware results.
5. Ensure performance scales with worldline size (number of indexed
   commits), not raw git history size (number of total commits).

## Why blocked by WARP_symbol-history-timeline

Temporal search is a query layer OVER per-symbol version history.
The timeline card builds the foundational data: walking commit→sym
edges and collecting signature changes, presence, and line ranges
per symbol across commits. Without that timeline, temporal search
would have to replicate all of that logic — it would effectively
be building the timeline card inline. The timeline is the data;
temporal search is the query interface.

## Related cards

- **WARP_symbol-history-timeline** (blocked_by — hard dep): Provides
  the per-symbol version data that temporal search queries against.
  See above.
- **WARP_dead-symbol-detection**: Dead symbol detection is a specific
  temporal query: "was this symbol removed and never re-added?"
  Temporal search generalizes this into an arbitrary query interface.
  Neither depends on the other — dead-symbol can query commit edges
  directly, and temporal search handles more than just removal
  detection.
- **WARP_codebase-entropy-trajectory**: Entropy works at the
  aggregate level (trends across all symbols). Temporal search works
  at the individual symbol level (specific queries about specific
  symbols). Different granularity, no dependency.

## Effort rationale

Medium. The underlying data access (walking commit→sym edges) is
handled by the symbol history timeline. This card's work is the
query layer: defining the temporal predicate API, implementing
each predicate as a filtered timeline query, and exposing via MCP.
The query interface design is non-trivial (needs to be expressive
without being a full query language) but the data infrastructure
is already handled by the prerequisite. M, not S, because the
predicate set needs careful design and the performance guarantee
(bounded by worldline size) requires indexing-aware implementation.
