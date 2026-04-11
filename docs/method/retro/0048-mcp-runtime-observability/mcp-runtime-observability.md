# Add structured runtime observability for the MCP surface Retro

Design: `docs/design/0048-mcp-runtime-observability/mcp-runtime-observability.md`
Outcome: Hill met: MCP runtime observability now emits metadata-only session and tool-call NDJSON events, receipts carry traceId and latencyMs for correlation, doctor reports the active runtime log posture, and graft internal logs are locally excluded so they do not perturb workspace-overlay or clean-head behavior.
Drift check: yes

## Summary

- added metadata-only MCP runtime observability at the server boundary
  with session-start, tool-start, tool-complete, and tool-failure NDJSON
  events
- extended MCP receipts with `traceId` and `latencyMs` so operators can
  correlate responses directly with runtime log events
- surfaced runtime observability posture through `doctor`
- ensured graft internal state is locally excluded via `.git/info/exclude`
  before runtime logs are written, so `.graft` activity does not pollute
  workspace-overlay or clean-head behavior

## Playback Witness

- Verification witness:
  `docs/method/retro/0048-mcp-runtime-observability/witness/verification.md`

## Drift

- None recorded.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-runtime-observability-composition.md`

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
