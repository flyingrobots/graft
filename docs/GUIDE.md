# Graft Setup Guide

## Install

```bash
npm install -g @flyingrobots/graft
```

Or run without installing:

```bash
npx @flyingrobots/graft
```

## Quick setup

```bash
npx @flyingrobots/graft init
```

Scaffolds your project for graft in one command:
- Creates `.graftignore` (template with examples)
- Adds `.graft/` to `.gitignore`
- Generates a `CLAUDE.md` snippet instructing agents to prefer graft tools
- Prints Claude Code hook config for manual setup

Idempotent — safe to run again without duplicating entries.

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

### Codex

Add to `.codex/config.toml` in your project root (per-project) or
`~/.codex/config.toml` (global):

```toml
[mcp_servers.graft]
command = "npx"
args = ["-y", "@flyingrobots/graft"]
```

**Note:** Codex may ask you to approve external MCP tool calls the
first time it uses graft. If you trust the local server, choose
"Always allow" so normal graft tool use does not require a prompt on
every call.

### Any MCP-compatible client

The pattern is the same everywhere:

- **Command**: `npx`
- **Args**: `["-y", "@flyingrobots/graft"]`
- **Transport**: stdio (the default for most clients)

If your client doesn't support `npx`, install globally and use:

- **Command**: `graft`
- **Args**: (none)

## Claude Code Hooks

Two hooks work together to govern agent reads:

- **PreToolUse** — blocks banned files before the read happens
- **PostToolUse** — educates the agent on context cost after large
  file reads complete

### Setup

Add to `.claude/settings.json` in your project root:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts"
          }
        ]
      }
    ]
  }
}
```

If developing graft itself, replace the `node_modules/...` paths
with local paths:

```
src/hooks/pretooluse-read.ts    (PreToolUse)
src/hooks/posttooluse-read.ts   (PostToolUse)
```

### PreToolUse — ban enforcement

When the agent calls `Read(file_path)`, the PreToolUse hook:

1. Evaluates the file against graft's policy
2. **Banned files** (binaries, lockfiles, secrets, `.graftignore`
   matches): exits 2 (block) with refusal reason and next steps
3. **Everything else**: exits 0 — lets native Read proceed

The PreToolUse hook does NOT block large files. It only enforces
hard bans. Large file governance is handled by the PostToolUse hook.

### PostToolUse — context cost education

After a Read completes, the PostToolUse hook evaluates what
`safe_read` would have done and tells the agent the cost:

```
[graft] You just read 450 lines (18KB) into context.
safe_read would have returned a structural outline (2048 bytes),
saving 16.0KB of context. Threshold: 150 lines / 12KB.
```

This feedback appears for large JS/TS files where an outline was
available. Small files, non-JS/TS files, and nonexistent files
produce no feedback. The hook always exits 0 — it never blocks.

### Limitations

Both hooks run as standalone processes — they do not share state
with the MCP server. This means:

- No session-depth dynamic caps (early/mid/late)
- No re-read suppression or cache hits
- No structural diffs on changed files
- No metrics tracking or receipts

For the full experience, agents should use graft's MCP tools
(`safe_read`, `file_outline`, `read_range`) directly. The hooks
are a safety net; the MCP server is the full governor.

### Disabling

To disable hooks locally without removing the project config,
add to `.claude/settings.local.json`:

```json
{
  "hooks": {}
}
```

## Tool Reference

| Tool | Description |
|------|-------------|
| `safe_read` | Policy-enforced file read. Returns full content for small files, structural outline with jump table for large files, or refusal with reason code for banned files. Detects re-reads and returns cached outlines or structural diffs. |
| `file_outline` | Structural skeleton of a file — function signatures, class shapes, exports. Includes a jump table mapping each symbol to its line range for targeted `read_range` follow-ups. |
| `read_range` | Read a bounded range of lines from a file. Maximum 250 lines. Use jump table entries from `file_outline` or `safe_read` to target specific symbols. |
| `changed_since` | Check if a file changed since it was last read. Returns structural diff (added/removed/changed symbols) or "unchanged". Peek mode by default; pass `consume: true` to update the observation cache. |
| `graft_diff` | Structural diff between two git refs. Shows added, removed, and changed symbols per file — not line hunks. Defaults to working tree vs HEAD. Policy-denied files are omitted from `files` and surfaced in `refused`. |
| `run_capture` | Execute a shell command and return the last N lines of output (default 60). Full output saved to `.graft/logs/capture.log` for follow-up `read_range` calls. |
| `state_save` | Save session working state (max 8 KB). Use for session bookmarks: current task, files modified, next planned actions. |
| `state_load` | Load previously saved session state. Returns null if no state has been saved. |
| `doctor` | Runtime health check. Shows project root, parser status, active thresholds, session depth, and message count. |
| `set_budget` | Declare a session byte budget. Graft tightens read thresholds as the budget drains — no single read may consume more than 5% of remaining budget. Call once at session start. |
| `explain` | Explain a graft reason code. Returns human-readable meaning and recommended next action for any code (e.g., `BINARY`, `BUDGET_CAP`). Case-insensitive. |
| `stats` | Decision metrics for the current session. Total reads, outlines, refusals, cache hits, and bytes avoided. |
| `graft_since` | Structural changes since a git ref. Shows symbols added, removed, and changed per file — not line hunks. Includes per-file summary lines. Policy-denied files are omitted from `files` and surfaced in `refused`. |
| `graft_map` | Structural map of a directory — all files and their symbols (function signatures, class shapes, exports) in one call. Uses tree-sitter to parse the working tree directly. Policy-denied files are omitted from `files` and surfaced in `refused`. |

## What the agent sees

Once configured, the agent gains 14 new tools. Here's what
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

### Structural memory (WARP)

`graft_since` shows what changed structurally between any two git
refs — symbols added, removed, and changed per file. Policy-denied
files are excluded from the visible file list and reported explicitly
in `refused`.

`graft_map` gives a structural map of any directory — every file
and its symbols (function signatures, class shapes, exports) in
one call. Denied files are surfaced explicitly instead of silently
disappearing.

Both tools work on the current working tree. For persistent
structural indexing across git history, use `graft index` from the
CLI.

### Structural navigation

`file_outline` returns the structural skeleton of any file —
function signatures, class members, exports — without the bodies.
Each symbol has a line range so the agent can follow up with
`read_range` for the specific code it needs.

### Git diffs

`graft_diff` shows what changed between git refs at the symbol
level: "function `foo` gained a parameter" instead of line hunks.
Denied files are excluded from the visible diff and reported in
`refused`.

### Budget governor

If the agent calls `set_budget(bytes)` at session start, graft
tracks cumulative bytes consumed and tightens thresholds as the
budget drains. No single read may consume more than 5% of remaining
budget. When the budget is exhausted, all reads return outlines.

Budget status appears in every receipt:
```json
"budget": { "total": 500000, "consumed": 14345, "remaining": 485655, "fraction": 0.029 }
```

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

### Codex says `user cancelled MCP tool call`

This can be a Codex approval issue rather than a graft failure.
Codex may require permission for external MCP tool calls. If those
prompts are denied, or cannot be shown in a non-interactive run, the
tool call may appear as cancelled.

- Run Codex interactively and approve graft tool calls
- If you trust the server, choose "Always allow" for graft
- Retry the call after granting permission
- If graft still fails, run `doctor` first to separate Codex setup
  problems from graft runtime problems

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
- `UNSUPPORTED_LANGUAGE` — no parser-backed outline exists for this file type yet; use `read_range` or a full read when appropriate
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
