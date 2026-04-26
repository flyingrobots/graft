---
title: "Release preflight typecheck repair"
cycle: "CLEAN_CODE_typecheck-release-preflight-errors"
design_doc: "docs/design/CLEAN_CODE_typecheck-release-preflight-errors.md"
source_backlog: "docs/method/backlog/bad-code/typecheck-release-preflight-errors.md"
outcome: hill-met
drift_check: yes
---

# Release preflight typecheck repair Retro

## Summary

The hill was met. `pnpm typecheck` now passes on the v0.7.0 release
branch without relaxing strict TypeScript settings or removing the
release preflight typecheck gate.

This closes the bad-code backlog card by retro/witness, not by a
graveyard tombstone.

## What Shipped

- Added missing `monitor_nudge` and `knowledge_map` entries to the MCP
  output body schema map.
- Returned complete monitor action failure DTOs from monitor nudge
  paths.
- Replaced exact-optional-property violations with omitted optional
  fields for structural log/churn options, session replay entries, and
  traverse hydration options.
- Aligned WARP structural churn/log DTOs with the operation result
  types.
- Updated operation tests to construct branded `OutlineEntry` value
  objects instead of stale structural object literals.
- Updated readonly-array assertions to sort cloned arrays.

## Validation

- `git diff --check`
- `pnpm typecheck`
- `pnpm exec vitest run test/unit/contracts/output-schemas.test.ts test/unit/operations/agent-handoff.test.ts test/unit/operations/knowledge-map.test.ts test/unit/warp/structural-drift-detection.test.ts test/unit/warp/warp-reference-count.test.ts`
- `pnpm guard:agent-worktrees`
- `pnpm lint`
- `pnpm test`

## Follow-On Pressure

The changes here repair the release-preflight type contract. They do
not remove the older Git-backed structural operation modules; that
cleanup remains separately tracked as existing bad-code debt.
