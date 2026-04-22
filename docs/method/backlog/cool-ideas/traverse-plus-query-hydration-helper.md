---
title: "Traverse + query batch hydration helper"
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
