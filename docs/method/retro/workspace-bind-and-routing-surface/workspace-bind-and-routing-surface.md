---
title: "Workspace bind and routing surface for the local shared daemon Retro"
---

# Workspace bind and routing surface for the local shared daemon Retro

Design: `docs/design/0052-workspace-bind-and-routing-surface/workspace-bind-and-routing-surface.md`
Outcome: Implemented daemon-mode workspace routing inside createGraftServer: added workspace_bind/workspace_status/workspace_rebind, daemon unbound gating, default-denied run_capture in daemon mode, fresh session-local slice reset on rebind, server-side repo/worktree identity resolution, and same-repo WARP reuse keyed by canonical repo identity while keeping repo-local graft serve unchanged.
Drift check: yes

## Summary

This cycle implemented the daemon-side routing contract in code without
adding a daemon transport yet.

The concrete result is:

- repo-local `graft serve` keeps the old pre-bound contract
- daemon mode now exposes `workspace_bind`, `workspace_status`, and
  `workspace_rebind`
- repo-scoped tools are denied until the daemon session is bound
- `run_capture` stays default-denied in daemon mode
- successful rebind creates a fresh session-local slice, so cache,
  budget, and saved state do not silently cross worktrees
- same-repo bindings reuse one repo-scoped WARP handle keyed by
  canonical repo identity inside the daemon server process

This leaves the next step clean: add the explicit local-only daemon
transport and lifecycle around a routing model that already exists in
the server.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- [CLEAN_CODE_mcp-workspace-router-composition.md](../../backlog/bad-code/CLEAN_CODE_mcp-workspace-router-composition.md)

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
