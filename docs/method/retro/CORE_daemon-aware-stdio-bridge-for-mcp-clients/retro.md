# Retro: CORE daemon-aware stdio bridge for MCP clients

## What shipped

Graft now exposes the already-tested daemon stdio bridge as a release-facing
MCP runtime.

Shipped behavior:

- `graft serve` remains repo-local stdio MCP
- `graft serve --runtime daemon` launches the daemon-backed stdio bridge
- `graft serve --runtime daemon --no-autostart` fails instead of starting a
  missing daemon
- `graft init --mcp-runtime daemon --write-*-mcp` emits daemon-backed MCP
  config with `serve --runtime daemon`
- existing repo-local generated config remains `serve`
- explicit runtime selection can update an existing generated graft MCP entry

## Playback

Repo-local generated config:

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

Daemon-backed generated config:

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

The active backlog DAG now shows
`CORE_opt-in-daemon-mode-mcp-bootstrap` as unblocked and still blocking
`SURFACE_bijou-tui-for-graft-daemon-control-plane`.

## Follow-up

`CORE_opt-in-daemon-mode-mcp-bootstrap` should get a relevance check next. This
cycle implemented the runtime selector and generated config path that the card
asks for, so the remaining card may need to be closed, rewritten, or demoted
instead of implemented again.

## Verification

- `pnpm exec vitest run test/unit/cli/main.test.ts test/unit/cli/init.test.ts test/unit/mcp/daemon-stdio-bridge.test.ts test/unit/contracts/output-schemas.test.ts test/unit/method/backlog-dependency-dag.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
