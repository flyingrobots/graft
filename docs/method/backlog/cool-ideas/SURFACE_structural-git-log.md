---
title: "Structural git log — symbol-level commit history"
legend: SURFACE
lane: cool-ideas
---

# Structural git log — symbol-level commit history

`git log` shows commit messages. `graft log` should show structural changes:

```
abc1234  +createUser (function), ~validateEmail (sig changed)
def5678  -legacyAuth (class removed), +modernAuth (class)
ghi9012  ~handleRequest (3 methods changed)
```

One line per commit, symbols added/removed/changed. Agents and humans can scan a structural changelog without reading diffs. WARP already indexes this — it's a projection over existing `changes`/`adds`/`removes` edges.

Pairs with `graft_since` but oriented toward history browsing, not two-ref comparison.
