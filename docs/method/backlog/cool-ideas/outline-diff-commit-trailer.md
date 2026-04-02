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
