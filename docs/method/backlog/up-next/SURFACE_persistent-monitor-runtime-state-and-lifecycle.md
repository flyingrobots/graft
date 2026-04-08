# Persistent monitor runtime state and lifecycle

Now that Graft has a daemon transport and a real control plane for
workspace authorization and session inspection, the remaining
"persistent monitors" gap should be explicit instead of implied.

Goals:
- define what a persistent repo monitor actually is in Graft
- expose start, stop, pause, and resume semantics through the daemon
  control plane
- surface monitor health, recent failures, and backlog pressure without
  exposing raw session-local receipts or shell output
- keep monitor state scoped to authorized workspaces and canonical repo
  identity
- avoid widening repo access beyond the existing workspace authorization
  contract

Questions:
- what work does a monitor perform continuously versus on demand
- is monitor identity per canonical repo, per worktree, or both at
  different layers
- what backlog-pressure signals are operator-useful before the UI
  becomes noisy
- how should monitor failures degrade when WARP is unavailable or
  behind
- how does the monitor lifecycle relate to future multi-repo
  coordination

Deliverables:
- explicit runtime model for persistent monitors
- daemon control-plane surface for lifecycle state changes
- bounded machine-readable health and backlog summaries
- follow-on split for any required WARP or scheduler work

Why separate cycle:
- cycle 0054 shipped the operator control plane for authorization and
  daemon-scoped inspection, but it did not ship actual persistent
  monitor workers or their lifecycle

Effort: L
