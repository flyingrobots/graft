---
title: "Traverse + query batch hydration helper"
feature: structural-queries
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "traverse.bfs API (shipped)"
  - "query().match().select().run() API (shipped)"
acceptance_criteria:
  - "A reusable helper function accepts an observer, start ID, and traversal options and returns hydrated nodes"
  - "The helper internally performs BFS for topology discovery, then batch-hydrates properties via query"
  - "Callers no longer need to manually chain traverse + query for graph-walking with property access"
  - "A test verifies the helper returns the same results as manual traverse-then-query"
  - "The helper is importable from a shared utility location"
---

# Traverse + query batch hydration helper

Pattern discovered during CORE_rewrite-structural-queries: traverse.bfs
for topology discovery, then query().match(ids).select(["id", "props"])
for batch property hydration. This two-step combo could be extracted
into a reusable helper:

```typescript
async function traverseAndHydrate(obs, startId, options) {
  const ids = await obs.traverse.bfs(startId, options);
  const result = await obs.query().match(ids).select(["id", "props"]).run();
  return result.nodes;
}
```

Would clean up any future graph-walking code that needs both topology
and properties.

## Implementation path

1. Define the helper function signature in a shared utility module
   (e.g., `src/warp/helpers/traverse-hydrate.ts`).
2. Accept parameters: observer instance, start node ID, traversal
   options (edge filter, depth limit, direction), and optional
   select fields (default to `["id", "props"]`).
3. Implement: run BFS with the traversal options, collect discovered
   node IDs, then batch-hydrate via `query().match(ids).select(fields).run()`.
4. Return the hydrated nodes array.
5. Refactor existing traverse-then-query callsites to use the helper.
6. Add a test that verifies the helper produces identical results
   to manual traverse + query.

## Related cards

- **bounded-neighborhood-for-references**: Bounded neighborhood
  (git-warp Rung 2) would replace this pattern for reference
  lookups — the substrate does traversal + hydration in one call.
  But bounded neighborhood is an external dependency (not yet
  available), and this helper is useful for ALL graph-walking
  patterns, not just references. Independent builds — the helper
  is useful now, bounded neighborhood is a future substrate
  improvement.
- **CORE_rewrite-structural-blame-to-use-warp-worldline-provenance**
  (v0.7.0): Structural blame rewrites likely use the traverse +
  query pattern. This helper could simplify that work, but blame
  doesn't require it. Nice-to-have, not a dependency.
- **CORE_rewrite-structural-log-to-use-warp-worldline-queries**
  (v0.7.0): Same relationship — structural log rewrites would
  benefit from the helper but don't require it.

## No dependency edges

All prerequisites are shipped (traverse.bfs, query API). This is
a pure utility extraction — no new data, no new infrastructure.
No backlog card requires this helper as a prerequisite, and no
backlog card must ship before this can be built.

## Effort rationale

Small. This is a mechanical extraction of an existing two-step
pattern into a reusable function. The BFS and query APIs are
shipped and well-tested. The helper adds no new behavior — it
composes two existing primitives. Implementation is a single
function plus one test. S is generous; this is closer to XS if
the scale existed.
