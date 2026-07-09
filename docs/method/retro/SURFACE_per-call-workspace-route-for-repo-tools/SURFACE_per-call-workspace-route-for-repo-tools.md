---
title: "Per-call workspace route for repo tools"
cycle: "SURFACE_per-call-workspace-route-for-repo-tools"
design_doc: "docs/design/SURFACE_per-call-workspace-route-for-repo-tools.md"
outcome: hill-met
drift_check: manual
---

# Per-call workspace route for repo tools Retro

## Summary

Routed repo tools now accept an explicit `cwd` route: `safe_read`,
`file_outline`, `read_range`, `changed_since`, `graft_diff`,
`graft_since`, `graft_map`, `code_show`, `code_find`, and `code_refs`.
The invocation engine resolves that route into an immutable workspace
execution context before policy checks and handlers run, and
`WorkspaceRouter` creates or reuses routed bindings without mutating the
session-global active workspace. Daemon routed calls still require prior
authorization.

The regression covers the dogfooding failure mode: one daemon-backed MCP
session activates repo A, then repo B, and routed `safe_read` and
`code_find` calls for repo A still resolve against repo A while legacy
active-workspace calls continue to resolve against repo B.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_per-call-workspace-route-for-repo-tools/witness`.

## What surprised you?

The HTTP daemon host already isolates separate MCP transport sessions.
The actual bug class is same-session agent multiplexing: several agents
can share one daemon-backed MCP session and race on one active workspace.

## What would you do differently?

The original opened-workspace design optimized for small tool schemas
and explicitly avoided per-tool `cwd`. That was too narrow for
multi-agent daemon use. Future repo-scoped tools should treat explicit
workspace routing as part of the public contract instead of relying only
on mutable active workspace state.

## Follow-up items

- Decide whether completed same-cycle bad-code findings should be moved
  from `bad-code/` to `graveyard/` automatically during retro.
