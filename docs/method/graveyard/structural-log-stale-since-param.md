---
title: "graft_log tool declares 'since' schema param but WARP version ignores it"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
disposition: completed
retired_by: "d368a82 chore(backlog): clear bad-code lane tranche"
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# graft_log declares 'since' but WARP version ignores it

## Disposition

Completed in `d368a82`. The original card was moved from
`docs/method/backlog/bad-code/` to the graveyard to preserve the backlog record.

The `graft_log` MCP tool schema still declares `since: z.string().optional()`
but `structuralLogFromGraph` doesn't support date-based filtering -
it only does tick-based ordering. The parameter is accepted but silently
dropped.

Either implement tick-based since filtering or remove the param from
the schema.

Affected files:
- `src/mcp/tools/structural-log.ts`
