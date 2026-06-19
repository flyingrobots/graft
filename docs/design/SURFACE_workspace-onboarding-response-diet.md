---
title: "Workspace onboarding and response diet"
legend: "SURFACE"
cycle: "SURFACE_workspace-onboarding-response-diet"
source_feedback: "AI dogfood feedback relayed 2026-06-18"
---

# Workspace onboarding and response diet

## Hill

Graft reduces the first-use daemon ramp and lets clients ask for smaller
read-orientation payloads without weakening workspace authorization or changing
the default MCP response contract.

## Acceptance Criteria

- `workspace_bind` can explicitly authorize and bind a daemon workspace in one
  call when the caller passes an authorization flag.
- Failed daemon binds include a machine-readable next-call hint for the exact
  control-plane call that unblocks the bind.
- Default `workspace_bind`, `file_outline`, and `_receipt` responses remain
  backward compatible.
- `file_outline` supports opt-in response shapes that return only outline
  entries or only jump-table navigation entries.
- Tool responses support an opt-in compact receipt that preserves call identity,
  projection, reason, byte count, and burden posture without the cumulative
  statistics block.

## Playback Questions

### Human

- [ ] Can a new daemon client intentionally authorize and bind a workspace
      without discovering `workspace_authorize` through a second failure?
- [ ] Can a client reduce small response overhead without losing the default
      observability contract for existing consumers?

### Agent

- [ ] Does `workspace_bind({ cwd, authorize: true })` authorize and bind a
      previously unauthorized daemon workspace?
- [ ] Does a denied bind return `nextCall.tool: "workspace_authorize"` with the
      resolved workspace path?
- [ ] Do default `file_outline` calls still include both `outline` and
      `jumpTable`?
- [ ] Do `file_outline` compact modes omit the unrequested structural half?
- [ ] Do compact receipts omit `cumulative` while retaining enough metadata for
      per-call accounting?

## Non-goals

- [ ] Do not implicitly authorize a workspace just because `workspace_bind` was
      called.
- [ ] Do not remove receipts by default.
- [ ] Do not remove `jumpTable` or `outline` from default `file_outline`
      responses.
- [ ] Do not change repo-local workspace behavior.
- [ ] Do not redesign the full receipt observability model.

## Test Strategy

- Add daemon workspace-binding tests for explicit authorize-and-bind and
  next-call hints.
- Add MCP handler tests for `file_outline` compact response modes.
- Add receipt-mode tests for compact receipt shape and default receipt
  compatibility.
