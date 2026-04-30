---
title: "graft_log tool declares 'since' schema param but WARP version ignores it"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# graft_log declares 'since' but WARP version ignores it

## Relevance

Relevant. Accepted-but-ignored parameters are misleading API surface.

## Original Card

The `graft_log` MCP tool schema still declares `since: z.string().optional()`
but `structuralLogFromGraph` doesn't support date-based filtering - it only
does tick-based ordering. The parameter is accepted but silently dropped.

Either implement tick-based since filtering or remove the param from the schema.

Affected files:

- `src/mcp/tools/structural-log.ts`

## Design

Drop unsupported `since` from the WARP-backed MCP schema, CLI parser, CLI usage
text, and structural-log design truth surface.

## Tests

Contract and CLI output schema tests passed as part of the tranche validation.
