# System-wide control plane for persistent monitors

If Graft grows a persistent service that watches repository paths, it
should present one control-plane surface system-wide rather than one
per repo or per worktree.

Goals:
- one place to see which repos are being monitored
- one place to start, stop, pause, or inspect monitoring state
- one place to surface failures, health, and backlog pressure
- one place to manage authorized workspaces and daemon capability
  posture
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

Trust-model constraint from cycle 0050:
- operator control plane should be the place where workspace
  authorization and escape-hatch posture are made visible and changed
- session or repo health views must not imply cross-session access to
  raw receipts, caches, or shell output

Effort: L
