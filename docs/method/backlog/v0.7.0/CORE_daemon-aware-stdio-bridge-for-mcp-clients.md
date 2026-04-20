---
title: "Daemon-aware stdio bridge for MCP clients"
legend: CORE
lane: v0.7.0
---

# Daemon-aware stdio bridge for MCP clients

# Why

`graft daemon` is a real MCP surface, but many editor and agent clients
still only know how to launch a stdio command. Today that keeps the
default bootstrap story pinned to `graft serve`, even when an operator
wants daemon-only features such as shared worker pools, persistent
monitors, and daemon-wide control-plane inspection.

# Desired end state

- Graft ships an explicit stdio-facing bridge command that generic MCP
  clients can launch with `command` plus `args`
- the bridge connects to the local daemon MCP surface at `/mcp` instead
  of starting a repo-local server
- if the daemon is not running, the bridge can start it, wait for
  `/healthz`, and only then begin proxying MCP traffic
- daemon session lifecycle remains honest: open, initialized, and close
  events still map to real daemon sessions rather than fake repo-local
  sessions
- same-user local trust boundaries remain intact; this is not remote or
  multi-tenant transport

# Notes

- preserve daemon authorization posture instead of weakening it into
  silent cross-repo access
- keep repo-local `graft serve` as the default and simplest path
- this is the transport compatibility seam that makes daemon mode usable
  in clients that cannot connect to Unix sockets or named pipes
