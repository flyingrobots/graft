---
legend: SURFACE
status: completed
severity: P1
source: dogfooding
design: docs/design/SURFACE_per-call-workspace-route-for-repo-tools.md
retro: docs/method/retro/SURFACE_per-call-workspace-route-for-repo-tools/SURFACE_per-call-workspace-route-for-repo-tools.md
---

# Session-global workspace activation races

## Finding

Workspace activation is session-global state. When several agents share
one daemon-backed MCP session and each calls `workspace_open` with
`activate: true`, the latest activation controls relative path
resolution for later repo-scoped calls from every participant in that
session.

## Why It Matters

This is a P1 path-routing correctness defect. A relative read intended
for repo A can resolve against repo B after another participant
activates repo B. Policy boundaries still apply to the active workspace,
but the tool can inspect the wrong authorized repo and return misleading
results.

## Evidence

- Existing design: `docs/design/SURFACE_opened-workspace-paths.md`
  chooses "one active workspace per MCP session" and explicitly avoids
  per-tool `cwd` routing.
- Runtime shape: `WorkspaceRouter` owns `currentBinding`, and
  `ToolContext.resolvePath` falls back to the current router binding
  when no invocation execution context is active.
- Dogfooding report: concurrent agents sharing one active daemon session
  observed Graft resolving paths against the wrong repo; the external
  Read fallback absorbed the user-visible failure.

## Acceptance

- Repo-scoped read, structural, search, and diff tools can accept
  explicit `cwd` as a per-call workspace route.
- Routed calls do not mutate `workspace_status` or the active workspace.
- Daemon routed calls require prior workspace authorization.
- A regression proves that repo B activation no longer forces a routed
  repo A read to resolve in repo B.

## Follow-on

Decide whether completed same-cycle bad-code findings should be moved
from `bad-code/` to `graveyard/` automatically during retro.
