---
title: "pnpm typecheck fails on the release branch"
feature: release-preflight
kind: leaf
legend: CLEAN_CODE
effort: M
---

# pnpm typecheck fails on the release branch

During `CORE_agent-worktree-hygiene` validation on 2026-04-26,
`pnpm typecheck` failed with existing strict TypeScript errors outside
the worktree-hygiene changes.

Representative failures:

- `src/contracts/output-schema-mcp.ts` is missing schema entries for
  `monitor_nudge` and `knowledge_map`.
- `src/mcp/persistent-monitor-runtime.ts` returns monitor failure
  objects that do not satisfy `MonitorActionResult`.
- `src/mcp/server-context.ts` references `MonitorActionResult` without
  importing or declaring it.
- `src/mcp/tools/structural-churn.ts` and
  `src/mcp/tools/structural-log.ts` pass explicit `undefined` optional
  fields under `exactOptionalPropertyTypes`.
- `src/warp/warp-structural-churn.ts` and
  `src/warp/warp-structural-log.ts` return objects that no longer match
  their declared result types.
- Several operation tests construct stale `OutlineEntry` fixtures or
  mutate readonly arrays.

This blocks `pnpm release:check` because the release preflight includes
`pnpm typecheck`.
