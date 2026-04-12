---
title: "MCP runtime observability secret scrubbing"
legend: HT
lane: bad-code
---

# MCP runtime observability secret scrubbing

Audit source: `docs/audit/2026-04-11_ship-readiness.md`.

Problem:

`mcp-runtime.ndjson` may accidentally retain sensitive argument values if log sanitization is too narrow or value-size handling is too permissive.

Why it matters:

- runtime observability is intentionally metadata-first, but the guarantee is only credible if secret-bearing keys and oversized string payloads are scrubbed consistently
- this is a security posture issue, not just log hygiene

Desired shape:

- expand secret-key scrubbing beyond the current narrow set
- truncate or redact suspiciously large string values before persistence
- add invariant tests for common keys such as `token`, `apiKey`, `secret`, `password`, and similar variants
- keep the runtime log useful for debugging without storing raw sensitive content

Likely files:
- `src/mcp/runtime-observability.ts`
- related runtime observability tests

Effort: S-M
