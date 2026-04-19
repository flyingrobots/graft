---
title: "Retro 0032 — Structural Tool Policy Enforcement"
---

# Retro 0032 — Structural Tool Policy Enforcement

**Status:** Met

## What shipped

Structural MCP tools now activate the shared MCP policy seam instead of
reading structural data outside the governed surface.

The cycle covered:

- `graft_map`
- `graft_diff`
- `graft_since`

Denied files are now:

- excluded from visible structural `files` payloads
- surfaced explicitly in a top-level `refused` array with reason
  metadata
- filtered before structural diffing/parsing work proceeds

This keeps aggregation surfaces useful for allowed files while making
policy-denied files visible instead of silently omitted.

## What remains

Still open in the policy area:

- `run_capture` policy boundary
- cross-surface policy parity witnesses
- versioned JSON schemas for the expanded structural response shape

## Evidence

- witness: `npx vitest run test/unit/mcp/structural-policy.test.ts`
- surrounding MCP verification:
  - `npx vitest run test/unit/mcp/structural-policy.test.ts test/unit/mcp/precision.test.ts test/unit/mcp/layered-worldline.test.ts`
  - `npx vitest run test/unit/mcp/tools.test.ts test/unit/mcp/changed.test.ts`
- repo verification: `pnpm test`, `pnpm lint`, `pnpm typecheck`
