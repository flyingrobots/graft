# Define auth, authorization, and isolation for a shared daemon Retro

Design: `docs/design/0050-shared-daemon-authz-and-isolation/shared-daemon-authz-and-isolation.md`
Outcome: Defined the shared-daemon trust model as same-user and local-machine only by default, with workspace bind as the authorization event, explicit isolation boundaries for repo/worktree/session/log state, and default-denied escape hatches. Rolled the result into product docs, related backlog items, and the ranked queue.
Drift check: yes

## Summary

This cycle turned the shared-daemon direction from an implied future
idea into an explicit trust model. The repo now states that today's
supported posture is repo-local stdio and local-user bootstrap, while a
future shared daemon is same-user and local-machine only by default,
authorizes access at workspace bind, keeps repo/worktree/session state
separate, and treats escape hatches like `run_capture` as default-off
capabilities. The resulting model was pushed into the design packet,
operator docs, the ranked queue, and the adjacent daemon/control-plane
backlog items.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
