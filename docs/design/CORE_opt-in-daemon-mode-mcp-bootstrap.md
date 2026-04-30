---
title: Opt-in daemon mode for generated MCP client config
feature: daemon
kind: trunk
legend: CORE
lane: v0.7.0
cycle: CORE_opt-in-daemon-mode-mcp-bootstrap
status: completed
retro: "docs/method/retro/CORE_opt-in-daemon-mode-mcp-bootstrap/retro.md"
completed_by: "618c4e4 feat(cli): expose daemon-backed mcp runtime"
requirements:
  - Daemon-aware stdio bridge for MCP clients
acceptance_criteria:
  - graft init exposes an explicit daemon-mode opt-in flag
  - Generated config points at the stdio bridge, not raw graft serve
  - Default remains repo-local stdio; daemon only when requested
---

# Opt-in daemon mode for generated MCP client config

## Relevance Check

Fully satisfied by `618c4e4 feat(cli): expose daemon-backed mcp runtime`.
No additional daemon feature implementation was needed.

## Acceptance Criteria Diff

Already satisfied:

- `graft init` exposes an explicit daemon-mode opt-in flag:
  `--mcp-runtime daemon`
- generated config points at the daemon-backed stdio bridge:
  `serve --runtime daemon`
- default remains repo-local stdio:
  generated config is still `serve` unless daemon runtime is requested
- bootstrap works across supported config writers: Claude, Codex, Cursor,
  Windsurf, Continue, and Cline are covered by init tests
- setup docs distinguish repo-local stdio from daemon-backed stdio
- rerunning `init` preserves idempotent config merges and only updates an
  existing graft MCP entry when runtime selection is explicit

Remaining:

- none for this card

## Original Why

`graft init --write-*-mcp` currently writes repo-local `graft serve`
config. That is the right default, but it leaves daemon mode as a
manual, under-documented expert path. Operators need one explicit,
discoverable hook that says "use the daemon-backed MCP path for this
app" without editing the generated config by hand.

## Desired End State

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

## Notes

- keep the default posture conservative: repo-local stdio first,
  daemon-backed MCP only when requested
- cross-reference existing setup honesty around `workspace_authorize`
  and `workspace_bind`
- related pressure already exists in
  `SURFACE_non-codex-instruction-bootstrap-parity`
