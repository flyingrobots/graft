# Retro — 0036 CLI Surface Completion

**Status:** Met  
**Legend:** CORE

## What Shipped

- grouped CLI peers for bounded reads, structural navigation,
  precision lookup, and diagnostics
- one shared capability registry covering CLI and MCP parity
- CLI JSON schema coverage for the new grouped command surface
- explicit decision: `index` remains a narrow CLI-only admin
  exception

## What Changed

The CLI is no longer just bootstrap plus maintenance. It is now a
truthful operator/debugging peer for the core product surface.

The grouped namespaces (`read`, `struct`, `symbol`, `diag`) keep the
CLI coherent while still routing through the existing MCP tool
handlers, which preserves policy, receipts, and response meaning.

## Follow-ons

- `docs/method/backlog/up-next/CORE_non-read-burden.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
