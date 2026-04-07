# Add structured runtime observability for the MCP surface

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
