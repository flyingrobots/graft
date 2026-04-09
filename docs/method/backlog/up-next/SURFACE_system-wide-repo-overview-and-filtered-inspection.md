# System-wide repo overview and filtered inspection

Build the first real multi-repo coordination surface on top of the
daemon control plane.

Goals:

- show one bounded row per canonical repo
- keep repo identity keyed by `git common dir`
- keep worktree identity keyed by resolved worktree root
- derive visibility from the authorization registry and daemon-owned
  runtime state instead of hidden session activity
- expose high-signal fields such as:
  - authorized worktrees
  - active bound sessions
  - monitor health
  - backlog pressure
  - last activity
- avoid raw receipts, cache content, saved state, or shell output

Questions:

- which repo row fields are high signal enough to stay default-on
- what limited drill-down is useful without becoming noisy
- how should repo overview relate to `daemon_status`,
  `daemon_sessions`, and `daemon_monitors` without duplicating them

Depends on:

- `docs/design/0056-system-wide-multi-repo-agent-coordination/system-wide-multi-repo-agent-coordination.md`

Effort: M
