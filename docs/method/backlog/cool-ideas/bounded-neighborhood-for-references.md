---
title: "Bounded neighborhood read for referencesForSymbol"
feature: structural-queries
kind: leaf
legend: WARP
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "referencesForSymbol tool (shipped)"
  - "WARP Level 2 bounded neighborhood API (not shipped — git-warp substrate)"
acceptance_criteria:
  - "referencesForSymbol resolves via a single bounded-neighborhood query instead of manual traversal"
  - "No explicit observer aperture or traversal setup is required by the caller"
  - "Response includes honest support cost from the WARP substrate"
  - "Performance is equal to or better than the current traversal-based implementation"
---

# Bounded neighborhood read for referencesForSymbol

When git-warp ships bounded neighborhood reads (observer geometry ladder,
Rung 2), `referencesForSymbol` becomes a one-liner: "give me the incoming
`references` neighborhood of this sym node." No traversal setup, no
observer aperture, just a semantic question. The substrate answers it
with honest support cost.

Watch for: git-warp v19+ `entity-at-coordinate` and `bounded neighborhood`
APIs.

## Implementation path

1. **Wait for git-warp substrate**: The bounded neighborhood API
   (`entity-at-coordinate`, `bounded neighborhood`) is a Rung 2
   feature in the observer geometry ladder. Not yet available in
   git-warp. This card is blocked on external substrate evolution.
2. Once the API is available, replace the current `referencesForSymbol`
   implementation (which manually traverses `references` edges via
   the observer) with a single bounded-neighborhood call.
3. The call signature would be roughly:
   `observer.neighborhood(symNodeId, { edge: 'references', direction: 'incoming', bound: depth })`
4. The substrate returns all nodes within the bounded neighborhood
   plus an honest support cost (how much computation the query
   required), which gets passed through to the agent.
5. Validate that performance is equal to or better than the current
   traversal-based implementation across repos of varying size.
6. Remove the manual traversal code path once the bounded
   neighborhood path is validated.

## External dependency: git-warp bounded neighborhood API

This card depends on a git-warp substrate feature (observer geometry
Rung 2) that is not yet shipped. It cannot be implemented until
git-warp provides the `bounded neighborhood` primitive. This is
an external dependency, not a backlog card.

## Related cards

- **traverse-plus-query-hydration-helper**: The hydration helper
  extracts the current pattern of BFS + batch property query into
  a reusable function. Bounded neighborhood would replace this
  pattern entirely for the references use case — the substrate does
  the traversal and hydration in one call. If bounded neighborhood
  ships, the hydration helper becomes less necessary for
  reference-like queries (though still useful for custom traversals).
  Not a hard dependency in either direction.
- **WARP_minimum-viable-context**: MVC uses reference edges to
  build dependency surfaces. Bounded neighborhood would make MVC's
  reference lookups faster and simpler. Nice enhancement but MVC
  can build on the current traversal API. Not a hard dependency.

## No dependency edges (within backlog)

The only prerequisite is the git-warp bounded neighborhood API,
which is an external substrate feature, not a backlog card. No
backlog card must ship first, and no backlog card is blocked
waiting for this optimization.

## Effort rationale

Small. Once the git-warp bounded neighborhood API is available,
this is a straightforward replacement: swap manual traversal with
a single API call. The API does the heavy lifting. Testing and
validation are the main work, not implementation. The effort is
dominated by the wait for substrate support, not by the code change.
