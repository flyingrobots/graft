---
title: "graft_log tool declares 'since' schema param but WARP version ignores it"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
---

# graft_log declares 'since' but WARP version ignores it

The `graft_log` MCP tool schema still declares `since: z.string().optional()`
but `structuralLogFromGraph` doesn't support date-based filtering —
it only does tick-based ordering. The parameter is accepted but silently
dropped.

Either implement tick-based since filtering or remove the param from
the schema.

Affected files:
- `src/mcp/tools/structural-log.ts`
