---
title: "Structural blame"
---

# Structural blame

"Who last changed this function's signature?" Not line-level
blame — structural blame. Which commit changed the signature of
evaluatePolicy? Which commit added this class?

The WARP graph already stores commit→symbol edges with `changes`,
`adds`, and `removes` labels. Structural blame is a reverse
traversal of these edges.

Output: per-symbol attribution with commit SHA, author, date, and
what changed (added, signature changed, moved).

Depends on: WARP Level 1 (shipped).
