# System-wide control plane for persistent monitors

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Ship a real daemon control plane before any tray UI or background
monitor worker exists.

That means:

- daemon workspace authorization becomes explicit and central instead of
  being implied by `workspace_bind`
- daemon sessions and authorized workspaces become inspectable through a
  daemon-wide surface
- daemon capability posture becomes visible and operator-controlled at
  the authorized-workspace layer
- the control plane remains bounded: no raw receipts, shell output, or
  cross-session cache exposure

## Playback Questions

### Human

- [x] Is there now one daemon-wide surface to inspect authorized
  workspaces instead of relying on per-session bind state alone?
- [x] Can an operator see active daemon sessions without seeing another
  session's raw receipts or shell output?
- [x] Is workspace authorization now changed through the control plane
  rather than being silently granted by `workspace_bind`?

### Agent

- [x] Does daemon bind now fail clearly for unauthorized workspaces?
- [x] Can daemon capability posture be changed centrally and reflected
  in later bind results?
- [x] Does the control plane remain same-user local and daemon-scoped
  rather than becoming a separate remote admin plane?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  one daemon host, many daemon sessions, a persistent authorized
  workspace registry, and one current workspace binding per session.
- Non-visual or alternate-reading expectations:
  daemon-wide state is available as structured tool output and `/healthz`
  counts, so an operator or agent does not need a tray UI or raw logs to
  understand authorization and session posture.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  daemon control-plane state uses stable machine-readable names such as
  `authorized`, `bound`, `unbound`, and `runCapture`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths for worktree roots and socket
  paths.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  whether workspace authorization is required, which workspaces are
  authorized, which daemon sessions are currently active, and what
  capability posture applies after bind.
- What must be attributable, evidenced, or governed:
  authorization changes, daemon session presence, default capability
  posture, and the fact that daemon-wide inspection does not widen
  access to another session's receipts, caches, or shell output.

## Non-goals

- [x] Do not build a macOS menu bar or tray app in this cycle.
- [x] Do not ship actual persistent monitor workers or their
  start/stop/pause lifecycle in this cycle.
- [x] Do not widen daemon authorization beyond same-user local control.
- [x] Do not expose raw session-local receipts, runtime logs, caches, or
  shell output through the daemon control plane.
- [x] Do not change repo-local `graft serve`.

## Backlog Context

If Graft grows a persistent service that watches repository paths, it
should present one control-plane surface system-wide rather than one per
repo or per worktree.

The original backlog item asked for:

- one place to see which repos are being monitored
- one place to start, stop, pause, or inspect monitoring state
- one place to surface failures, health, and backlog pressure
- one place to manage authorized workspaces and daemon capability
  posture

This cycle intentionally narrows that problem to the part that is real
today:

- central authorization and capability posture
- daemon-scoped session inspection
- daemon-wide health counts

The actual persistent monitor runtime remains a follow-on backlog item:

- `docs/method/backlog/up-next/SURFACE_persistent-monitor-runtime-state-and-lifecycle.md`

Related:

- `docs/design/0050-shared-daemon-authz-and-isolation/shared-daemon-authz-and-isolation.md`
- `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/design/0052-workspace-bind-and-routing-surface/workspace-bind-and-routing-surface.md`
- `docs/design/0053-local-daemon-transport-and-session-lifecycle/local-daemon-transport-and-session-lifecycle.md`

Effort: L

## Implementation Notes

This cycle turns the daemon control plane into a code-level MCP surface.

### New daemon-only control-plane tools

- `daemon_status`
  - daemon-wide health counts
  - authorized workspace and repo counts
  - default daemon capability posture
- `daemon_sessions`
  - active daemon sessions
  - bind state and workspace identity only
- `workspace_authorizations`
  - authorized workspaces
  - capability posture and active bound-session counts
- `workspace_authorize`
  - authorize a workspace for future daemon binds
  - optionally change daemon capability posture per authorized
    workspace
- `workspace_revoke`
  - revoke workspace authorization without pretending that already-open
    sessions never existed

### Authorization model

- daemon sessions still start unbound
- `workspace_bind` and `workspace_rebind` now require prior
  authorization through `workspace_authorize`
- authorization remains server-resolved from git identity, not
  client-declared ids
- authorization is stored under the daemon graft dir so it survives
  daemon restarts

### Capability posture

- daemon default posture remains:
  - bounded reads enabled
  - structural tools enabled
  - precision tools enabled
  - state bookmarks enabled
  - runtime logs session-local only
  - `run_capture` denied
- the control plane can now lift `run_capture` per authorized workspace
  explicitly
- bind results and workspace status surface the capability profile that
  actually applies

### Bounded inspection

- daemon session inspection exposes only:
  - session id
  - bind state
  - workspace identity
  - capability posture
  - started-at and last-activity timestamps
- no daemon control-plane tool exposes:
  - another session's raw receipt bodies
  - saved state content
  - cache content
  - runtime log payloads
  - shell output

### Runtime surfaces

- `/healthz` now reflects daemon-wide control-plane counts, not just
  transport liveness
- the daemon host remains the owner of:
  - the shared repo-scoped WARP pool
  - daemon session lifecycle
  - the persistent authorization registry
