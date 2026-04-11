# Extend governor thinking beyond file reads Retro

Design: `docs/design/0049-non-read-burden/non-read-burden.md`
Outcome: Shipped measurement-first non-read burden instrumentation: receipts now classify burden kind and mark non-read, stats exposes burden-by-kind totals, doctor exposes a compact burden summary, and focused plus full verification passed.
Drift check: yes

## Summary

This cycle shipped measurement-first non-read burden instrumentation on
the live MCP surface. Receipts now classify each tool call by burden
kind and mark whether it is non-read, `stats` now exposes cumulative
burden-by-kind totals plus a non-read aggregate, and `doctor` now
surfaces a compact session burden summary. The cycle stayed within its
non-goal boundary: no new governor caps or search/shell policy were
introduced.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- [CLEAN_CODE_mcp-metrics-boundaries.md](../../backlog/bad-code/CLEAN_CODE_mcp-metrics-boundaries.md)
  `src/mcp/metrics.ts` still accepts raw numeric deltas without runtime
  guards.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
