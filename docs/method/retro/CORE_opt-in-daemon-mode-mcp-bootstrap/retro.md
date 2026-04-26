# Retro: CORE opt-in daemon mode MCP bootstrap

## What shipped

No new implementation was needed in this cycle.

The relevance check found that
`CORE_opt-in-daemon-mode-mcp-bootstrap` was already satisfied by
`618c4e4 feat(cli): expose daemon-backed mcp runtime`.

That prior cycle shipped:

- `graft init --mcp-runtime daemon`
- daemon-backed generated MCP config using `serve --runtime daemon`
- default repo-local generated MCP config using `serve`
- explicit runtime updates for existing generated graft MCP entries
- tests for Claude, Codex, Cursor, Windsurf, Continue, and Cline config
  generation
- setup/MCP/CLI docs explaining repo-local stdio vs daemon-backed stdio

## Acceptance Criteria Diff

Satisfied:

- `graft init` exposes an explicit daemon-mode opt-in flag
- generated config points at the daemon-backed stdio bridge
- default remains repo-local stdio, and daemon mode is only selected when
  requested

Remaining:

- none

## Playback

Repo-local bootstrap remains:

```bash
graft init --write-codex-mcp
```

Daemon-backed bootstrap is:

```bash
graft init --mcp-runtime daemon --write-codex-mcp
```

Generated repo-local args:

```json
["-y", "@flyingrobots/graft", "serve"]
```

Generated daemon-backed args:

```json
["-y", "@flyingrobots/graft", "serve", "--runtime", "daemon"]
```

This closes the card and removes its blocker from
`SURFACE_bijou-tui-for-graft-daemon-control-plane`.

## Verification

- `pnpm exec vitest run test/unit/cli/init.test.ts test/unit/cli/main.test.ts test/unit/method/backlog-dependency-dag.test.ts`
- `git diff --check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
