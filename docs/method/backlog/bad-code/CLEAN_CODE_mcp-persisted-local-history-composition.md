# CLEAN CODE: MCP persisted local-history composition

`src/mcp/persisted-local-history.ts` is now carrying too many roles in
one seam:

- storage and file persistence
- continuity classification
- summary projection
- evidence derivation
- explicit attach declaration handling

Why this is bad:

- continuity rules and evidence policy will keep changing during WARP
  work, and coupling them tightly to file persistence will create churn
- attach/fork/park semantics are product logic, not just persistence
  details
- summary shaping is an output concern that should not be tangled with
  record mutation logic

Desired end state:

- separate continuity/evidence policy from persistence mechanics
- isolate summary/view projection from record append/update logic
- keep the store honest as a bounded persistence seam, not a mini
  workflow engine

Related:

- `docs/design/0060-persisted-sub-commit-local-history/persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
- `docs/method/backlog/cool-ideas/SURFACE_attach-to-existing-causal-session.md`
