---
title: "Traverse + query batch hydration helper"
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
