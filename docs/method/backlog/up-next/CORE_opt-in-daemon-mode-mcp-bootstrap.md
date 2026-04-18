---
title: "Opt-in daemon mode for generated MCP client config"
legend: CORE
lane: up-next
---

# Opt-in daemon mode for generated MCP client config

# Why

`graft init --write-*-mcp` currently writes repo-local `graft serve`
config. That is the right default, but it leaves daemon mode as a
manual, under-documented expert path. Operators need one explicit,
discoverable hook that says "use the daemon-backed MCP path for this
app" without editing the generated config by hand.

# Desired end state

- `graft init` exposes one explicit daemon-mode opt-in for generated MCP
  client config, for example an `--mcp-runtime daemon` style switch or
  equivalent profile
- the generated client config points at the daemon-aware stdio bridge
  rather than raw `graft serve`
- the bootstrap story works across the currently supported config
  writers, including Codex and the generic MCP-compatible path
- setup docs clearly distinguish default repo-local stdio from optional
  daemon-backed bootstrap
- rerunning `init` preserves idempotent config merges and does not
  silently flip existing users onto daemon mode

# Notes

- keep the default posture conservative: repo-local stdio first,
  daemon-backed MCP only when requested
- cross-reference existing setup honesty around `workspace_authorize`
  and `workspace_bind`
- related pressure already exists in
  `SURFACE_non-codex-instruction-bootstrap-parity`
