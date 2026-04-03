# Graft Setup Guide

## Install

```bash
npm install -g @flyingrobots/graft
```

Or run without installing:

```bash
npx @flyingrobots/graft
```

## MCP Configuration

Graft runs as an MCP server over stdio. Add it to your editor or
agent's MCP configuration.

### Claude Code

Add to `.mcp.json` in your project root (per-project) or
`~/.claude.json` (global):

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

### Cursor

Add to Cursor's MCP settings (Settings → MCP Servers → Add):

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

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

### VS Code + Continue

Add to `.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "graft",
      "command": "npx",
      "args": ["-y", "@flyingrobots/graft"]
    }
  ]
}
```

### Cline

Add via Cline's MCP settings UI, or in
`.vscode/cline_mcp_settings.json`:

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

### Any MCP-compatible client

The pattern is the same everywhere:

- **Command**: `npx`
- **Args**: `["-y", "@flyingrobots/graft"]`
- **Transport**: stdio (the default for most clients)

If your client doesn't support `npx`, install globally and use:

- **Command**: `graft`
- **Args**: (none)

## What the agent sees

Once configured, the agent gains 10 new tools. Here's what
happens when it uses them:

### Reading files

The agent calls `safe_read` instead of reading files directly.
Graft decides what to return:

- **Small files** (< 150 lines, < 12 KB): full content, as normal.
- **Large files**: a structural outline showing function signatures,
  class shapes, and exports — with a jump table mapping each symbol
  to its line range. The agent can then use `read_range` to read
  specific sections.
- **Banned files** (binaries, lockfiles, `.env`, minified bundles,
  build output): refused with a reason code and suggested
  alternatives.
- **Re-reads**: if the agent reads the same unchanged file twice,
  graft returns the cached outline instead of the full content.
  If the file changed, it returns a structural diff (added/removed/
  changed symbols).

### Structural navigation

`file_outline` returns the structural skeleton of any file —
function signatures, class members, exports — without the bodies.
Each symbol has a line range so the agent can follow up with
`read_range` for the specific code it needs.

### Git diffs

`graft_diff` shows what changed between git refs at the symbol
level: "function `foo` gained a parameter" instead of line hunks.

### Session awareness

Graft tracks the session and tightens policy as context pressure
grows:

| Session stage | Max read size |
|---------------|---------------|
| Early (< 100 messages) | 20 KB |
| Mid (100–500 messages) | 10 KB |
| Late (> 500 messages) | 4 KB |

Tripwires warn when sessions are going off the rails (> 500
messages, edit-bash loops, runaway tool calls).

### Receipts

Every response includes a `_receipt` block with session ID,
sequence number, projection type, bytes returned, and cumulative
counters. This is for usage analysis — you can ignore it.

## Configuration

### .graftignore

Create a `.graftignore` file in your project root to ban
additional file patterns:

```text
# Generated files
*.generated.ts
*.snap

# Vendor code
vendor/**

# Large data files
data/**/*.json
```

Patterns follow the same syntax as `.gitignore` (glob matching
via picomatch).

### Policy defaults

| Setting | Default | Description |
|---------|---------|-------------|
| Line threshold | 150 | Files over this → outline |
| Byte threshold | 12 KB | Files over this → outline |
| Max range | 250 lines | read_range cap |
| State cap | 8 KB | state_save max size |
| Capture tail | 60 lines | run_capture default |

These are not yet configurable at runtime (planned for a future
release).

## Troubleshooting

### "Tool not found" or no graft tools visible

- Verify graft is installed: `npx @flyingrobots/graft --help`
  (should start the server; Ctrl+C to stop)
- Check your MCP config syntax — JSON must be valid
- Restart your editor/agent after adding MCP config
- Some clients cache tool lists — try reopening the project

### Agent keeps getting outlines instead of content

Your files are over 150 lines or 12 KB. This is intentional.
The agent should use the jump table from the outline to
`read_range` the specific section it needs.

### Agent can't read a file (refused)

Check the reason code in the response:
- `BINARY` — binary file, use `ls -lh` or `file` for metadata
- `LOCKFILE` — read `package.json` instead
- `SECRET` — `.env` files are banned for safety
- `BUILD_OUTPUT` — read the source file, not `dist/`
- `GRAFTIGNORE` — file matches a `.graftignore` pattern

### graft is slow on first call

Tree-sitter WASM grammars load on first parse (~200ms). Subsequent
calls are fast.

## Verify it works

After setup, ask your agent to read a large file in your project.
Instead of dumping the entire file, it should return an outline
with a jump table. That's graft working.

You can also ask the agent to call `doctor` to verify:

```
Use the doctor tool to check graft's health.
```

This returns the project root, parser status, active thresholds,
and session depth.
