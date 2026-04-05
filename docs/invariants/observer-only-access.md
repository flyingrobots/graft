# Invariant: Observer-Only Access

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

Structural queries over WARP must be expressed through observers,
not hand-written graph traversal.

## Why it matters

The design treats "write facts, read projections, never traverse
by hand" as an architectural law. If application code walks
adjacency lists directly, builds shadow indexes, or mirrors graph
state outside observer APIs, the system has collapsed back into
"graph database with extra steps."

Every prior application built on git-warp made this mistake. Graft
must not.

## How to check

- No application code in `src/` walking node adjacency directly
- No query helpers that mirror graph state outside observer APIs
- Every WARP-backed tool goes through the observer factory
- `grep` for direct `getNodes()`, `getEdges()` calls on raw
  materialized state — they should only appear in observer
  construction, not in tool handlers
