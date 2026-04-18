---
title: "Cycle 0026 — MCP/CLI Parity Audit"
---

# Cycle 0026 — MCP/CLI Parity Audit

**Hill:** The repo can say, for every product-facing capability,
whether it exists on both surfaces, is an intentional narrow
exception, or is a real parity gap with follow-on work attached.

**Outcome:** Met.

## What shipped

- official 0026 design doc for capability-level CLI/MCP parity
- current parity matrix for all exposed capabilities
- explicit exception list with rationale
- backlog split for the real implementation work

## Playback

- Agent: can I tell whether a capability is available through MCP, CLI,
  or both without reverse-engineering the repo? **Yes.**
- Agent: if a capability exists on only one surface, can I tell whether
  that is intentional or drift? **Yes.**
- Operator: are bootstrap/setup and transport-only exceptions explicit?
  **Yes.**
- Operator: does the audit produce concrete follow-on backlog instead of
  one vague umbrella item? **Yes.**
- Maintainer: can I tell whether new feature work needs a peer surface?
  **Yes** — the matrix and split backlog now make that question visible.

## Findings

- The current CLI is not a peer product surface to MCP. It is mostly a
  bootstrap and maintenance surface.
- The actual product surface — bounded reads, structural queries,
  diagnostics, and precision tools — lives almost entirely in MCP.
- `init` and transport bootstrap are clean intentional CLI-only
  exceptions.
- `set_budget`, `state_save`, and `state_load` are clean MCP-only
  session mechanics.
- `index` needs an explicit decision instead of continuing as an
  unexamined special case.

## Lessons

- The parity invariant was directionally right, but it needed a matrix
  and exception list before it became actionable.
- Capability parity is the right unit, not name parity.
- A shared capability registry is likely the architectural follow-on
  that prevents this drift from recurring.

## Follow-on work

- `docs/method/backlog/up-next/CORE_cli-bounded-read-surface.md`
- `docs/method/backlog/up-next/CORE_cli-structural-navigation-surface.md`
- `docs/method/backlog/up-next/CORE_cli-diagnostics-and-capture-surface.md`
- `docs/method/backlog/up-next/CORE_index-surface-parity-decision.md`
- `docs/method/backlog/up-next/CLEAN_CODE_shared-capability-registry-for-cli-and-mcp.md`
