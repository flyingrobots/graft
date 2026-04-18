---
title: "Cycle 0033 — `run_capture` Policy Boundary"
---

# Cycle 0033 — `run_capture` Policy Boundary

**Hill:** `run_capture` no longer sits in policy limbo. Its contract is
explicit in code, docs, and tests: it remains available as a
diagnostic shell-output escape hatch outside graft's bounded-read
policy contract.

## Why now

Cycle 0030 identified `run_capture` as the one remaining undecided
surface in the policy audit. Unlike bounded repo reads, shell command
output cannot honestly be governed by `.graftignore`, file bans,
session depth, or budget in the same way. Leaving that implicit makes
policy claims fuzzy and invites false trust.

## Playback questions

1. Does every `run_capture` response declare that it is outside the
   bounded-read policy contract?
2. Is that declaration present on both successful and failed command
   execution?
3. Do README and GUIDE stop describing `run_capture` like a normal
   governed read surface?
4. Have we made the diagnostic log path part of the same explicit
   escape-hatch story instead of pretending it is an ordinary read-back
   channel?

## Scope

In scope:
- MCP `run_capture` contract
- explicit machine-readable policy-boundary marker
- product docs for `run_capture`
- tests for success and failure responses

Out of scope:
- replacing `run_capture`
- governing arbitrary shell output
- cross-surface parity witnesses
- CLI parity for shell capture

## Design

`run_capture` should remain available, but only as an explicit
exception.

The response should include a top-level `policyBoundary` object that
states:
- `kind: "shell_escape_hatch"`
- `boundedReadContract: false`
- `policyEnforced: false`

This same object must be returned for successful and failed command
execution.

The log file written to `.graft/logs/capture.log` should be described
as a diagnostic artifact of the same escape hatch, not as a normal
bounded-read surface.

This keeps the product honest:
- bounded-read surfaces still owe policy parity
- `run_capture` is no longer silently treated as if it belonged to that
  class

## Witnesses

- successful `run_capture` returns the explicit `policyBoundary` marker
- failed `run_capture` returns the same marker
- docs describe `run_capture` as outside bounded-read policy
