---
title: "Outline diff in commit trailers"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "graft diff (shipped)"
  - "Outline extraction (shipped)"
acceptance_criteria:
  - "A post-commit hook appends a Structural-Diff trailer to the commit message"
  - "The trailer lists added, removed, and changed symbols with their kind (function, class, etc.)"
  - "Agents can parse the trailer from git log output without reading the actual diff"
  - "The trailer format is machine-readable and documented"
---

# Outline diff in commit trailers

Post-commit hook appends a structural summary to the commit message
as a trailer:

```
Structural-Diff: added createGraftServer; changed SessionTracker.getMessageCount (new)
```

Machine-readable metadata that agents can consume from `git log`
without reading the actual diff. Pairs naturally with `graft diff`
(same structural diff primitive, different output target).

Depends on: graft diff.
