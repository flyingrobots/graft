# System-wide MCP daemon and workspace binding Retro

Design: `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
Outcome: Defined the future local shared-daemon workspace-binding contract: repo-local `graft serve` stays intact, daemon sessions start unbound, workspace bind becomes the authorization event, canonical repo identity/worktree identity/session state split is explicit, and same-repo bindings share one repo-scoped WARP by default.
Drift check: yes

## Summary

This cycle defined the future local shared-daemon binding contract
without pretending the daemon transport already exists.

The concrete decisions were:

- keep repo-local `graft serve` as the current stdio path
- make a future daemon a separate local-only transport and lifecycle
  surface
- start daemon sessions unbound and make `workspace_bind` the
  authorization event
- split identity across canonical repo (`git common dir`), live
  worktree, and session-local state
- keep one repo-scoped WARP per canonical repo by default, even when
  multiple sessions or worktrees bind into that repo

The cycle also split the follow-on implementation path into separate
backlog items for transport/lifecycle and bind/routing, while keeping
deeper same-repo concurrent-agent semantics attached to the existing
WARP concurrency design item.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
