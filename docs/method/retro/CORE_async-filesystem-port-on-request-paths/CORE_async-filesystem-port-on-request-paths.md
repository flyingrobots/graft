---
title: "Async filesystem port on request paths"
cycle: "CORE_async-filesystem-port-on-request-paths"
design_doc: "docs/design/CORE_async-filesystem-port-on-request-paths.md"
outcome: hill-met
drift_check: yes
---

# Async filesystem port on request paths Retro

## Summary

Cycle 0066 removed the remaining shared MCP-side `readFileSync`
dependency from the async filesystem-port path.

What landed:

- workspace binding now loads `graftignore` through the async filesystem
  port
- startup exclusion of `.graft` now loads `.git/info/exclude` through
  the async filesystem port
- the cycle packet was shaped around the request-path async posture
  instead of the broader CLI and hook debt

Key implementation commits:

- `00a9003` `fix(mcp): load graftignore asynchronously on bind`
- `03ede10` `fix(mcp): load runtime exclude file asynchronously`

## Playback Witness

- Verification log: [verification.md](../0066-async-filesystem-port-on-request-paths/witness/verification.md#L1)
- Daemon bind regression: [workspace-binding.test.ts](../../../../test/unit/mcp/workspace-binding.test.ts#L124)
- Startup exclusion regression: [runtime-observability.test.ts](../../../../test/unit/mcp/runtime-observability.test.ts#L877)
- Request-path async posture regression: [safe-read.test.ts](../../../../test/unit/operations/safe-read.test.ts#L209)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
