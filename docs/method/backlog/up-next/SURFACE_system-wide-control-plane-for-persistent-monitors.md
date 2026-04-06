# System-wide control plane for persistent monitors

If Graft grows a persistent service that watches repository paths, it
should present one control-plane surface system-wide rather than one
per repo or per worktree.

Goals:
- one place to see which repos are being monitored
- one place to start, stop, pause, or inspect monitoring state
- one place to surface failures, health, and backlog pressure
- keep repo-local semantics in Graft while keeping service operations
  centralized

Human surface ideas:
- macOS: menu bar / system tray control plane
- Linux: likely status notifier / tray integration if available
- Windows: deprioritized for now, but a tray surface is the obvious
  analog if support becomes necessary

Why separate cycle:
- this is a product/control-plane problem for persistent services, not a
  repo-model problem

Effort: L
