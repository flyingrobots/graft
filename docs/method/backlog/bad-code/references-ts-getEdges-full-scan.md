---
title: "references.ts getEdges() full scan"
file: src/warp/references.ts
line: 30
---

# references.ts getEdges() full scan

`referencesForSymbol` calls `obs.getEdges()` on a wide `ast:*+file:*+sym:*`
aperture, pulling all visible edges into JS memory to filter for incoming
`references` edges on a single target node.

Should be `traverse.bfs(targetId, { dir: 'in', labelFilter: 'references', maxDepth: 1 })` —
same pattern established in `structural-queries.ts`. No upstream dependency.
