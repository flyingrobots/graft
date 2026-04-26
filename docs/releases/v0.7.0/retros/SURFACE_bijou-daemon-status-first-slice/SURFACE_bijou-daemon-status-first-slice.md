---
title: "Bijou daemon status first slice"
cycle: "SURFACE_bijou-daemon-status-first-slice"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/SURFACE_bijou-daemon-status-first-slice.md"
outcome: hill-met
drift_check: yes
---

# Bijou daemon status first slice Retro

## Summary

Read-only daemon status first slice shipped. `graft daemon status [--socket <path>]` builds a normalized daemon status model from existing read-side MCP surfaces and renders deterministic Bijou text. Temp-repo playback used a throwaway git repo, throwaway daemon root, and throwaway socket; the live checkout was not used as subject data. The output showed daemon health, cwd, socket, MCP path, runtime, sessions, workspaces, monitors, scheduler pressure, worker pressure, and `degraded: none`. No mutating daemon actions were added. No live refresh, keyboard navigation, monitor controls, workspace authorize/revoke/bind/rebind actions, governed writes, WARP/LSP work, or provenance expansion were added.

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/SURFACE_bijou-daemon-status-first-slice/witness`.

## Temp-Repo Playback

Playback was performed against a throwaway git repo, throwaway daemon root, and
throwaway socket. The live checkout was not used as the daemon status subject.
The temp resources were cleaned up after playback.

```text
Daemon Status  health: ok
cwd: /var/folders/1h/qn5740kx131g0sxvgv12vm_m0000gn/T/graft-daemon-status-playback-repo-9PdFMp
socket: /var/folders/1h/qn5740kx131g0sxvgv12vm_m0000gn/T/graft-daemon-status-playback-root-5yaJBt/daemon.sock
mcp: /mcp

Surface	State
runtime	transport unix_socket; started 2026-04-26T14:34:12.349Z; warp repos 0
sessions	total 1; bound 0; unbound 1; listed 1
workspaces	auth 0; repos 0; bound 0; current none; status-session unbound; active unknown
monitors	total 0; running 0; paused 0; stopped 0; failing 0; backlog 0; listed 0
scheduler	idle; active 0/2; queued 0; interactive 0; background 0; longest wait 0ms
workers	idle; child_processes; busy 0/1; idle 1; queued 0

degraded: none
```

## Non-Goals Confirmed

- No mutating daemon actions were added.
- No live refresh was added.
- No keyboard navigation was added.
- No playback used the live checkout as subject data.
- No governed write/edit work, WARP/LSP expansion, or provenance expansion was added.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
