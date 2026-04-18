---
title: "Cycle 0039 — Release Readiness Hardening"
---

# Cycle 0039 — Release Readiness Hardening

**Hill:** Clear the remaining ASAP release-readiness backlog by
hardening `run_capture`, adding a release-time dependency/security gate,
and removing the current Vite advisory path from the package graph.

## Why now

The 2026-04-07 audit packet left three concrete ASAP items:

1. `CORE_run-capture-hardening`
2. `CORE_release-security-gate`
3. `CORE_vite-security-update`

These are cohesive enough to land as one release-readiness slice:

- one product trust boundary (`run_capture`)
- one release preflight contract (`security:check`)
- one live dependency issue (Vite in the Vitest chain)

## Playback questions

- Does `run_capture` have an explicit enable/disable posture?
- Can operators disable capture-log persistence?
- Are obvious secret-shaped values redacted before persisted logs are
  written?
- Does release preflight fail clearly on high or critical audit
  findings?
- Is the current Vite advisory path eliminated?

## Scope

- `run_capture` config seam
- persisted-log redaction and opt-out persistence
- release security gate script and workflow step
- release-runbook documentation update
- dependency graph update to remove the vulnerable Vite resolution

## Non-goals

- redesigning `run_capture` into a non-shell tool
- replacing synchronous shell execution in this cycle
- full policy-profile support
