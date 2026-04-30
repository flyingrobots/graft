---
title: "Sludge detector"
cycle: "CORE_sludge-detector"
design_doc: "docs/design/CORE_sludge-detector.md"
source_backlog: "docs/method/backlog/v0.7.0/CORE_sludge-detector.md"
outcome: hill-met
drift_check: yes
---

# Sludge detector Retro

## Summary

The hill was met. `doctor` now supports an opt-in parser-backed sludge
scan through MCP/API calls and CLI peer commands.

This closes the v0.7.0 backlog card by retro/witness, not by a
graveyard tombstone.

## What Shipped

- Added `analyzeSludgeFile` and `detectSludge` in
  `src/operations/sludge-detector.ts`.
- Added optional `sludge` and `path` args to the `doctor` MCP tool.
- Added `graft diag doctor --sludge --path <path> --json`.
- Added `graft doctor --sludge --path <path> --json` as a short CLI
  alias.
- Added optional `sludge` output schemas for MCP and CLI doctor
  responses.
- Added tests for operation behavior, MCP doctor output, CLI alias
  routing, and output schema compatibility.
- Updated release-facing docs for the new diagnostic surface.

## Validation

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm exec vitest run test/unit/operations/sludge-detector.test.ts test/unit/mcp/tools.test.ts test/unit/cli/main.test.ts test/unit/contracts/output-schemas.test.ts`
- `pnpm test`

## Follow-On Pressure

The detector intentionally avoids being a linter or release gate. It
uses parser evidence and outline structure to produce an operator
diagnostic. Future work could tune thresholds from real usage data or
add LSP-backed semantic checks once `WARP_lsp-enrichment` lands.
