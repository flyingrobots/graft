---
title: Expose daemon-backed stdio as release-facing MCP runtime
feature: daemon
kind: trunk
legend: CORE
lane: v0.7.0
cycle: CORE_daemon-aware-stdio-bridge-for-mcp-clients
status: completed
retro: "docs/method/retro/CORE_daemon-aware-stdio-bridge-for-mcp-clients/retro.md"
requirements:
  - Daemon control plane exists (shipped)
  - Daemon MCP surface at /mcp exists (shipped)
  - Daemon stdio bridge substrate exists and is tested
acceptance_criteria:
  - CLI exposes an explicit daemon-backed stdio MCP runtime
  - Generated MCP config can select repo-local stdio or daemon-backed stdio
  - Runtime naming makes repo-local vs daemon-backed behavior obvious
  - Failure modes are clear when the daemon is unavailable, unbound, or unauthorized
  - Existing repo-local graft serve behavior remains unchanged
  - Tests prove generated config uses the correct args for both runtimes
  - docs/SETUP.md explains repo-local stdio vs daemon-backed stdio
blocking:
  - CORE_opt-in-daemon-mode-mcp-bootstrap
---

# Expose daemon-backed stdio as release-facing MCP runtime

## Relevance

Relevant. The capabilities probe found that the daemon-backed stdio bridge is
not missing substrate. `src/mcp/daemon-stdio-bridge.ts` exists and bridge tests
already cover internal behavior. The remaining gap is productization: users and
generated MCP config need a release-facing way to select the daemon-backed
stdio runtime.

## Audit Correction

Not: build a daemon-aware stdio bridge from scratch.

Instead: expose the tested daemon-backed stdio bridge as a release-facing MCP
client runtime.

## Design

Keep the existing mental model:

- `graft serve` starts repo-local stdio MCP for the current checkout
- `graft serve --runtime daemon` starts a stdio bridge to the local daemon MCP
  surface
- `graft init --mcp-runtime repo-local` emits the current default config shape
- `graft init --mcp-runtime daemon` emits config that launches the daemon-backed
  stdio runtime

The bridge should continue to enforce daemon posture:

- if the daemon is unavailable, startup either auto-starts it or reports a clear
  readiness failure
- daemon sessions still start unbound
- repository tools remain unavailable until the daemon workspace authorization
  and binding flow succeeds
- unauthorized or unbound states are reported by the daemon MCP surface instead
  of being hidden by the bridge

## Tests

Add focused CLI/bootstrap tests before implementation:

- `graft serve --runtime daemon` routes to the daemon-backed stdio bridge
- default `graft serve` still routes to repo-local stdio
- generated repo-local MCP config still uses `serve`
- generated daemon-backed MCP config uses `serve --runtime daemon`
- explicit runtime selection can update generated config

Focused tests passed in:

- `test/unit/cli/main.test.ts`
- `test/unit/cli/init.test.ts`
- `test/unit/mcp/daemon-stdio-bridge.test.ts`
- `test/unit/contracts/output-schemas.test.ts`

## Playback

Final CLI/config shape:

- repo-local stdio: `graft serve`
- daemon-backed stdio: `graft serve --runtime daemon`
- daemon-backed stdio without auto-start: `graft serve --runtime daemon --no-autostart`
- repo-local generated config: `graft init --write-*-mcp`
- daemon-backed generated config:
  `graft init --mcp-runtime daemon --write-*-mcp`

Before:

```json
{
  "mcpServers": {
    "graft": {
      "command": "npx",
      "args": ["-y", "@flyingrobots/graft", "serve"]
    }
  }
}
```

After daemon runtime selection:

```json
{
  "mcpServers": {
    "graft": {
      "command": "npx",
      "args": ["-y", "@flyingrobots/graft", "serve", "--runtime", "daemon"]
    }
  }
}
```

This removes the bridge blocker from
`CORE_opt-in-daemon-mode-mcp-bootstrap`, which is now unblocked for a
follow-up relevance check.
