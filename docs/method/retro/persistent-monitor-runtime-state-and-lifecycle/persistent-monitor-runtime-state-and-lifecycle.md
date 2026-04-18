---
title: "Persistent monitor runtime state and lifecycle Retro"
---

# Persistent monitor runtime state and lifecycle Retro

Design: `docs/design/0055-persistent-monitor-runtime-state-and-lifecycle/persistent-monitor-runtime-state-and-lifecycle.md`
Outcome: Shipped the first real daemon-side persistent worker as a
repo-scoped `git_poll_indexer`. Daemon mode now exposes explicit monitor
lifecycle tools, monitor state persists across daemon restart, and
bounded monitor health/backlog counts are visible through MCP and
`/healthz` without widening repo access beyond authorized workspaces.

## What changed

- added `src/mcp/persistent-monitor-runtime.ts` as the persistent
  monitor runtime and state seam
- added daemon-only MCP tools:
  - `daemon_monitors`
  - `monitor_start`
  - `monitor_pause`
  - `monitor_resume`
  - `monitor_stop`
- changed `daemon_status` and `/healthz` so they surface aggregate
  monitor counts
- changed the daemon host so monitors share the repo-scoped WARP pool
  and survive daemon restart
- changed monitor control so it still requires an authorized workspace,
  even if another worktree in the same repo is authorized
- rolled the queue forward to multi-repo coordination

## Playback answers

- There is now a real daemon-visible monitor surface instead of a
  placeholder promise.
- The first worker does real useful work: background incremental WARP
  indexing.
- Monitor identity is one repo-scoped worker per canonical repo.
- Lifecycle actions remain behind workspace authorization.
- Restart persistence is real and tested.
- Multi-repo coordination and same-repo concurrent write safety still
  remain follow-on work.

## Verification

See `docs/method/retro/0055-persistent-monitor-runtime-state-and-lifecycle/witness/verification.md`.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-persistent-monitor-runtime-composition.md`
