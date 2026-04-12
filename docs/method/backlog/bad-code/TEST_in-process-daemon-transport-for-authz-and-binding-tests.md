---
title: "In-process daemon transport for authz and binding tests"
legend: TEST
lane: bad-code
---

# In-process daemon transport for authz and binding tests

Audit source: `docs/audit/2026-04-11_code-quality.md`.

Problem:

Daemon integration tests currently rely on real sockets, HTTP transport, and filesystem state to verify authz and workspace-binding behavior.

Why it matters:

- daemon authz and workspace-binding are high-risk seams
- physical transport setup makes the tests slower, noisier, and harder to target as security invariants
- a lighter in-process harness would make authz isolation and binding semantics easier to verify exhaustively

Desired shape:

- introduce an in-process daemon transport or equivalent harness for tests
- verify authorization, binding, and session isolation logic without creating physical sockets
- keep a smaller set of real transport integration tests for end-to-end coverage

Likely files:
- daemon test helpers
- daemon server / control-plane tests

Effort: M
