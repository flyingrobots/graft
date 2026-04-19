---
title: "Cycle 0002 — MCP Transport"
---

# Cycle 0002 — MCP Transport

**Type:** Feature
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

A coding agent can use Graft as an MCP server. Setup is a one-liner.
Every Phase 1 command is exposed as an MCP tool. The server tracks
session state for tripwires and dynamic caps.

## Playback questions

### Agent perspective

1. Can I call `safe_read` as an MCP tool and get structured JSON back?
2. Can I call `file_outline` and get an outline with a jump table?
3. Can I call `read_range` with start/end and get bounded content?
4. Can I call `state_save` / `state_load` through MCP?
5. Does the server track my session (message count, tool calls) for
   tripwires and dynamic caps?
6. Is the MCP tool schema clear enough that I know what arguments to
   pass without reading docs?

### Operator perspective

1. Can I start the MCP server with a single command?
2. Can I add it to Claude Code's MCP config with a one-liner?
3. Can I run it via Docker without installing Node?
4. Does `doctor` work as an MCP tool for debugging?
5. Does `stats` show decision metrics from the current session?

## Non-goals

- **No Claude Code hooks** yet (separate cycle — hooks enforce policy
  by intercepting Read/Bash, which is different from offering tools).
- **No HTTP/SSE transport** — stdio only for now (Claude Code, Cursor,
  and most MCP clients use stdio).
- **No auth** — local tool, local trust.

## MCP tools

Each Phase 1 command becomes an MCP tool:

| Tool | Arguments | Returns |
|------|-----------|---------|
| `safe_read` | `path`, `intent?` | SafeReadResult JSON |
| `file_outline` | `path` | FileOutlineResult JSON |
| `read_range` | `path`, `start`, `end` | ReadRangeResult JSON |
| `run_capture` | `command`, `tail?` | Captured output |
| `state_save` | `content` | `{ ok, reason? }` |
| `state_load` | (none) | `{ content }` |
| `doctor` | (none) | Health check JSON |
| `stats` | (none) | Metrics summary JSON |

## Session tracking

The MCP server maintains a `SessionTracker` instance per connection.
Every tool call increments the session counter. The server passes
`sessionDepth` from the tracker to `evaluatePolicy`, enabling dynamic
caps without the agent needing to know about session state.

Tripwire signals are included in tool responses when active.

## Startup

### npx (Node users)

```bash
npx @flyingrobots/graft
```

Or in Claude Code's MCP config (`~/.claude/claude_desktop_config.json`
or project `.mcp.json`):

```json
{
  "mcpServers": {
    "graft": {
      "command": "npx",
      "args": ["-y", "@flyingrobots/graft"]
    }
  }
}
```

### Docker (no Node required)

```bash
docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft
```

Or in MCP config:

```json
{
  "mcpServers": {
    "graft": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "${workspaceFolder}:/workspace", "flyingrobots/graft"]
    }
  }
}
```

The Docker image mounts the project directory at `/workspace` and
runs the MCP server with that as the project root.

### bin entry point

`bin/graft.js` — detects stdio MCP mode (default), starts the server.

## Dependencies

- `@modelcontextprotocol/sdk` — official MCP SDK for TypeScript

## Architecture

```
src/
  mcp/
    server.ts       MCP server setup, tool registration
    tools.ts        tool handlers (thin wrappers around operations)
  bin/
    graft.ts        CLI entry point — starts MCP stdio server
```

Dockerfile at project root.

## Test strategy

- `test/unit/mcp/` — tool registration, argument validation, response
  shapes
- `test/integration/mcp/` — spawn MCP server as subprocess, call
  tools via MCP client, verify end-to-end
