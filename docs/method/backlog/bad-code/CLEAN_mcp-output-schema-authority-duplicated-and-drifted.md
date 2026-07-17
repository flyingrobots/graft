---
title: "MCP output-schema authority is duplicated and already drifted"
feature: surface
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-07-17
---

# MCP output-schema authority is duplicated and already drifted

## Problem

`src/contracts/output-schemas.ts` is the live strict runtime authority, but
`src/contracts/output-schema-mcp.ts` still owns a second exhaustive
`McpToolName` body-schema map consumed by CLI rendering and daemon-status
decoding. The intended thin-barrel split was later re-expanded without retiring
the old assembly.

The copies are no longer equivalent. For example, the canonical `code_find`
contract is an object-root union that includes middleware refusal, while the
split assembly still declares one object shape. Adding an MCP tool currently
requires updating both exhaustive maps merely to typecheck.

## Risk

Runtime validation, CLI decoding, generated JSON Schema, and agent-facing MCP
discovery can describe different legal outputs while each local test appears
green. Future contract changes may update only one authority, as already
happened for `code_find`.

## Desired Outcome

Restore one executable MCP body-schema authority and make every strict runtime,
CLI, JSON-Schema, and bounded-discovery consumer derive from it. Keep the
refactor behavior-preserving; any intentional contract difference must be
named and tested rather than encoded by file choice.

## Acceptance Criteria

- One exhaustive MCP body-schema map is authoritative.
- Runtime and CLI consumers import or derive from that same map.
- Representative union/refusal mutation tests fail if a consumer projects a
  stale body contract.
- The old split files are either the real authority again or removed.
- Graveyard and architecture documentation describe the resulting structure
  truthfully.
