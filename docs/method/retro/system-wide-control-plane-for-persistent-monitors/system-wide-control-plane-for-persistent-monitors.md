---
title: "System-wide control plane for persistent monitors Retro"
---

# System-wide control plane for persistent monitors Retro

Design: `docs/design/0054-system-wide-control-plane-for-persistent-monitors/system-wide-control-plane-for-persistent-monitors.md`
Outcome: Shipped a real daemon control plane for central workspace authorization, daemon-wide session and workspace inspection, and per-workspace daemon capability posture. `workspace_bind` no longer self-authorizes arbitrary repos in daemon mode, and the remaining persistent-monitor worker lifecycle is now explicit follow-on backlog rather than implied scope.

## What changed

- added `src/mcp/daemon-control-plane.ts` as the persistent
  authorization and daemon-session registry seam
- added daemon-only MCP tools:
  - `daemon_status`
  - `daemon_sessions`
  - `workspace_authorize`
  - `workspace_authorizations`
  - `workspace_revoke`
- changed daemon bind/rebind so they require prior authorization
- changed daemon capability posture so `run_capture` can be enabled per
  authorized workspace instead of being permanently hardcoded
- updated `/healthz`, contracts, tests, and product docs around the new
  control-plane truth
- split the still-missing monitor-worker lifecycle into a new backlog
  item:
  `docs/method/backlog/up-next/SURFACE_persistent-monitor-runtime-state-and-lifecycle.md`

## Playback answers

- Daemon authorization is now explicit and central.
- A daemon session can inspect daemon-wide session and authorization
  posture without seeing another session's raw receipts or shell output.
- `workspace_bind` fails clearly for unauthorized workspaces.
- Per-workspace daemon capability posture is now visible and operator
  controlled.
- Repo-local `graft serve` remains unchanged.
- Actual persistent monitor workers still do not exist, and that gap is
  now explicit instead of hidden inside the control-plane claim.

## Verification

See `docs/method/retro/0054-system-wide-control-plane-for-persistent-monitors/witness/verification.md`.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-daemon-control-plane-composition.md`
