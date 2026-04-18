---
title: "Add structured runtime observability for the MCP surface"
---

# Add structured runtime observability for the MCP surface

Source backlog item: `docs/method/backlog/up-next/SURFACE_mcp-runtime-observability.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Ship metadata-only MCP runtime observability that records session
lifecycle, tool calls, failures, and latency without letting the log
surface become a new source of repo-content leakage or a new reason for
tool calls to fail.

## Playback Questions

### Human

- [ ] Can an operator locate the MCP runtime log and confirm whether it
      is enabled from `doctor` without spelunking the code?

### Agent

- [ ] Does every successful MCP response carry enough correlation data
      to line up with the runtime log?
- [ ] Do failed MCP calls emit a structured failure event without
      logging raw request values?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: operator-facing outputs
  stay in structured JSON and `doctor` exposes the runtime log posture
  directly instead of requiring file inspection.
- Non-visual or alternate-reading expectations: the runtime log remains
  line-oriented NDJSON and receipts stay machine-readable, so screen
  readers and text-only workflows do not need a second view.

## Localization and Directionality

- Locale / wording / formatting assumptions: timestamps stay ISO-8601
  and event names remain stable English identifiers.
- Logical direction / layout assumptions: runtime observability is
  schema-first JSON, so there is no layout-specific UI work in scope.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: receipts must
  expose stable trace/session/sequence data and `doctor` must expose the
  runtime log posture.
- What must be attributable, evidenced, or governed: tool start,
  completion, and failure events must be attributable without logging
  file content, query text, or other raw request payload values.

## Non-goals

- [ ] Building a full daemon-grade telemetry plane
- [ ] Logging raw tool arguments or returned file content
- [ ] Expanding metrics into a second analytics surface in this cycle

## Backlog Context

The 2026-04-07 ship-readiness audit found that Graft lacks durable,
structured runtime logging and trace correlation for MCP activity.
Today the system has useful receipts and metrics, but they are not a
substitute for operational observability.

Why this matters:
- debugging production-adjacent behavior is harder without durable trace
  records
- a future shared daemon will need stronger operational visibility than
  in-memory metrics and receipts provide
- request-path latency, refusal causes, and tool failures should be
  inspectable without reconstructing them from ad hoc logs

Desired end state:
- structured logs for MCP session lifecycle, tool calls, failures, and
  latency
- trace or correlation identifiers that tie logs, receipts, and metrics
  together
- a clear policy for what can be logged without leaking repo content or
  secrets

Effort: M
