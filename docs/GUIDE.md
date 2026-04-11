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
- Prints Claude Code hook and MCP config for manual setup

If you use `--write-codex-mcp`, `init` also seeds `AGENTS.md` so Codex
has a repo-local instruction layer alongside the MCP config.

Idempotent — safe to run again without duplicating entries.

## Choose Your Setup Path

Use this table when you want the shortest path instead of reading the
whole setup guide front-to-back.

| If you want... | Use this path | What happens |
|---|---|---|
| Claude Code MCP only in this repo | `npx @flyingrobots/graft init --write-claude-mcp` | Writes or merges `.mcp.json` |
| Claude Code MCP plus hook enforcement in this repo | `npx @flyingrobots/graft init --write-claude-mcp --write-claude-hooks` | Writes or merges `.mcp.json` and `.claude/settings.json` |
| Cursor MCP in this repo | `npx @flyingrobots/graft init --write-cursor-mcp` | Writes or merges `.cursor/mcp.json` |
| Windsurf MCP in this repo | `npx @flyingrobots/graft init --write-windsurf-mcp` | Writes or merges `.codeium/windsurf/mcp_config.json` |
| Continue MCP in this repo | `npx @flyingrobots/graft init --write-continue-mcp` | Writes or merges `.continue/config.json` |
| Cline MCP in this repo | `npx @flyingrobots/graft init --write-cline-mcp` | Writes or merges `.vscode/cline_mcp_settings.json` |
| Codex MCP in this repo | `npx @flyingrobots/graft init --write-codex-mcp` | Writes or merges `.codex/config.toml` and seeds `AGENTS.md` |
| Manual review before any config file write | `npx @flyingrobots/graft init` | Scaffolds repo files and prints the manual MCP / hook snippets |
| Global config instead of project-local config | Edit your client's global MCP settings manually | Use the `npx @flyingrobots/graft serve` command + args shown below |
| Another MCP-compatible client | Add graft manually to that client's MCP config | Use `command = npx`, `args = ["-y", "@flyingrobots/graft", "serve"]` |

## Governed Read Posture By Client

MCP availability is not the same thing as a governed default read path.
Use this table to see what each client actually gets today.

| Client path | MCP bootstrap | Repo-local instruction layer | Native read guardrail | Current posture |
|---|---|---|---|---|
| Claude Code with hooks | `--write-claude-mcp --write-claude-hooks` | `CLAUDE.md` | Yes, via `PreToolUse` / `PostToolUse` | Closest current default-governed path |
| Codex | `--write-codex-mcp` | `AGENTS.md` | No | Strong bootstrap guidance plus MCP, but no native-read interception |
| Cursor / Windsurf / Continue / Cline | `--write-*-mcp` | None written automatically today | No | MCP available, but governed reads still depend on agent choice |
| Other MCP-compatible clients | Manual MCP config | None written automatically today | No | MCP only |

## Deployment Posture

Graft's supported deployment posture today is local-user with two
distinct runtime paths:

- repo-local `serve`: one stdio MCP server per repo checkout plus
  repo-local bootstrap files such as `CLAUDE.md` or `AGENTS.md`
- `graft daemon`: a separate same-user local runtime on a Unix socket or
  Windows named pipe, with `/mcp` for MCP traffic and `/healthz` for
  liveness

The daemon is intentionally not the default editor bootstrap story yet.
It uses a stricter contract:

- daemon sessions start unbound
- workspace binding requires prior authorization through the daemon
  control plane
- canonical repo identity, live worktree identity, and session-local
  state remain separate
- `run_capture` stays default-denied unless an authorized workspace
  explicitly enables it

Daemon control-plane inspection now exists through MCP tools:

- `daemon_status`
- `daemon_repos`
- `daemon_sessions`
- `daemon_monitors`
- `monitor_start`
- `monitor_pause`
- `monitor_resume`
- `monitor_stop`
- `workspace_authorizations`
- `workspace_authorize`
- `workspace_revoke`

### One-step bootstrap

Write project-local client config directly when you want `init` to do
the wiring for you:

```bash
npx @flyingrobots/graft init --write-claude-mcp --write-claude-hooks
npx @flyingrobots/graft init --write-cursor-mcp
npx @flyingrobots/graft init --write-windsurf-mcp
npx @flyingrobots/graft init --write-continue-mcp
npx @flyingrobots/graft init --write-cline-mcp
npx @flyingrobots/graft init --write-codex-mcp
```

Supported write flags:

- `--write-claude-mcp` -> writes or merges `.mcp.json`
- `--write-claude-hooks` -> writes or merges `.claude/settings.json`
- `--write-cursor-mcp` -> writes or merges `.cursor/mcp.json`
- `--write-windsurf-mcp` -> writes or merges `.codeium/windsurf/mcp_config.json`
- `--write-continue-mcp` -> writes or merges `.continue/config.json`
- `--write-cline-mcp` -> writes or merges `.vscode/cline_mcp_settings.json`
- `--write-codex-mcp` -> writes or merges `.codex/config.toml` and
  seeds `AGENTS.md`

These writes are project-local and idempotent. Existing config is
preserved, and graft entries are only added when missing.

For automation, CLI commands support `--json`:

```bash
npx @flyingrobots/graft init --json
npx @flyingrobots/graft index --json
npx @flyingrobots/graft read safe src/app.ts --json
npx @flyingrobots/graft struct diff --json
npx @flyingrobots/graft symbol find 'create*' --json
npx @flyingrobots/graft diag activity --json
npx @flyingrobots/graft diag doctor --json
```

Grouped CLI namespaces:

- `read` — `safe`, `outline`, `range`, `changed`
- `struct` — `diff`, `since`, `map`
- `symbol` — `show`, `find`
- `diag` — `activity`, `doctor`, `explain`, `stats`, `capture`

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
      "args": ["-y", "@flyingrobots/graft", "serve"]
    }
  }
}
```

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-claude-mcp
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

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

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-cursor-mcp
```

### Windsurf

Add to `.codeium/windsurf/mcp_config.json` in your project root:

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

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-windsurf-mcp
```

### VS Code + Continue

Add to `.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "graft",
      "command": "npx",
      "args": ["-y", "@flyingrobots/graft", "serve"]
    }
  ]
}
```

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-continue-mcp
```

### Cline

Add via Cline's MCP settings UI, or in
`.vscode/cline_mcp_settings.json`:

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

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-cline-mcp
```

### Codex

Add to `.codex/config.toml` in your project root (per-project) or
`~/.codex/config.toml` (global):

```toml
[mcp_servers.graft]
command = "npx"
args = ["-y", "@flyingrobots/graft", "serve"]
startup_timeout_sec = 120
```

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-codex-mcp
```

That explicit write path also creates or merges `AGENTS.md` with graft
read guidance so Codex sees repo-local instructions as well as the MCP
server config.
If you already have an older graft block in `.codex/config.toml`,
rerunning that command will add the safer startup timeout without
duplicating the server entry.

The larger startup timeout is intentional. Cold `npx` startup can spend
enough time in package acquisition and bootstrap to exceed Codex's
default 30 second budget even when the graft server itself is healthy.

**Note:** Codex may ask you to approve external MCP tool calls the
first time it uses graft. If you trust the local server, choose
"Always allow" so normal graft tool use does not require a prompt on
every call.

### Any MCP-compatible client

The pattern is the same everywhere:

- **Command**: `npx`
- **Args**: `["-y", "@flyingrobots/graft", "serve"]`
- **Transport**: stdio (the default for most clients)

If your client doesn't support `npx`, install globally and use:

- **Command**: `graft`
- **Args**: `["serve"]`

## Claude Code Hooks

Two hooks work together to govern agent reads:

- **PreToolUse** — blocks banned files and redirects large JS/TS reads
  before the native read happens
- **PostToolUse** — backstop education if an oversized code read still
  completes

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

Project-local shortcut:

```bash
npx @flyingrobots/graft init --write-claude-hooks
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
3. **Large JS/TS files**: exits 2 with a redirect to `safe_read`,
   `file_outline`, and `read_range`
4. **Everything else**: exits 0 — lets native Read proceed

This is the current "default governed" path for Claude Code: large
code reads are redirected before the full file lands in context.
Other file types and other clients still rely on MCP usage or future
integration work.

### PostToolUse — backstop education

After a Read completes, the PostToolUse hook evaluates what
`safe_read` would have done for large JS/TS files and tells the agent
the cost:

```
[graft] This large code read bypassed graft's governed path for src/mcp/server.ts.
safe_read would have returned a structural outline (2048 bytes) instead of 450 lines (18.0KB),
saving 16.0KB of context. Threshold: 150 lines / 12KB.
```

This feedback appears only if an oversized JS/TS read still completes.
With a working PreToolUse hook, that should be a backstop signal rather
than the normal path. Small files, non-JS/TS files, and nonexistent
files produce no feedback. The hook always exits 0 — it never blocks.

### Limitations

Both hooks run as standalone processes — they do not share state
with the MCP server. This means:

- No session-depth dynamic caps (early/mid/late)
- No re-read suppression or cache hits
- No structural diffs on changed files
- No metrics tracking or receipts

For the full experience, agents should use graft's MCP tools
(`safe_read`, `file_outline`, `read_range`) directly. The hooks
make Claude closer to a default-governed path for large code reads, but
the MCP server remains the full governor and non-Claude clients still
need explicit integration.

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
| `graft_since` | Structural changes since a git ref. Shows added/removed/changed symbols per file and a summary line. Policy-denied files are omitted from `files` and surfaced in `refused`. |
| `graft_map` | Structural directory map of files and symbols under a path, with explicit denied-file reporting. |
| `code_show` | Focus on a symbol by name and return its source with line metadata. |
| `code_find` | Search symbols across the project by approximate name or glob pattern, with optional kind/path filter. |
| `code_refs` | Search import sites, callsites, property access, or literal text references with explicit text-fallback provenance, pattern, and scope. |
| `activity_view` | Bounded between-commit activity for the active workspace, including commit anchor, grouped recent activity, and degraded posture. |
| `doctor` | Runtime health check including layered-worldline repo state and burden summary. |
| `stats` | Decision metrics for the current server session, including burden by tool kind. |
| `explain` | Human-readable meaning and recommended action for a reason code. |
| `run_capture` | Execute a shell command and return the last N lines of output (default 60). This tool is outside graft's bounded-read policy contract, responses include an explicit `policyBoundary` marker, log persistence can be disabled, and persisted output is redacted for obvious secrets by default. |
| `state_save` | Save session working state (max 8 KB). Use for session bookmarks: current task, files modified, next planned actions. |
| `state_load` | Load previously saved session state. Returns null if no state has been saved. |

MCP responses include versioned `_schema` metadata and `_receipt`
fields. CLI peer commands also return versioned `_schema` metadata;
the declared contracts live in `src/contracts/output-schemas.ts`.
| `doctor` | Runtime health check. Shows project root, parser status, active thresholds, session depth, message count, and a compact burden summary. |
| `set_budget` | Declare a session byte budget. Graft tightens read thresholds as the budget drains — no single read may consume more than 5% of remaining budget. Call once at session start. |
| `explain` | Explain a graft reason code. Returns human-readable meaning and recommended next action for any code (e.g., `BINARY`, `BUDGET_CAP`). Case-insensitive. |
| `stats` | Decision metrics for the current session. Total reads, outlines, refusals, cache hits, bytes avoided, and returned-byte burden by tool kind. |

Every MCP tool response includes:
- `_receipt` — runtime decision metadata
- `_schema` — versioned output contract metadata

Declared output contracts live in `src/contracts/output-schemas.ts`.
| `graft_since` | Structural changes since a git ref. Shows symbols added, removed, and changed per file — not line hunks. Includes per-file summary lines. Policy-denied files are omitted from `files` and surfaced in `refused`. |
| `graft_map` | Structural map of a directory — all files and their symbols (function signatures, class shapes, exports) in one call. Uses tree-sitter to parse the working tree directly. Policy-denied files are omitted from `files` and surfaced in `refused`. |

## What the agent sees

Once configured, the agent gains 17 MCP tools. Here's what
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
trace ID, sequence number, latency, projection type, bytes
returned, and cumulative counters. This is for usage analysis and
correlation — you can usually ignore it.

If MCP runtime observability is enabled, `traceId` and `seq` line up
with `.graft/logs/mcp-runtime.ndjson`. `doctor` also reports the
current runtime log path and policy.

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

### run_capture posture

`run_capture` is a diagnostic shell escape hatch, not a bounded-read
tool. For broader or more sensitive deployments:

- set `GRAFT_ENABLE_RUN_CAPTURE=0` to disable execution entirely
- set `GRAFT_RUN_CAPTURE_PERSIST=0` to avoid writing `.graft/logs/capture.log`
- persisted capture output is redacted for obvious secret-shaped values
  by default

In the local daemon runtime, `run_capture` stays disabled by default and
requires an explicit operator-authorized capability profile rather than
inheriting local repo-scoped trust.

### MCP runtime observability

MCP runtime observability writes metadata-only session and tool-call
events to `.graft/logs/mcp-runtime.ndjson`. The log intentionally does
not include raw file content, query text, or other request payload
values.

- set `GRAFT_ENABLE_MCP_RUNTIME_LOG=0` to disable MCP runtime logging
- set `GRAFT_MCP_RUNTIME_LOG_PATH=/abs/path/mcp-runtime.ndjson` to move
  the log
- set `GRAFT_MCP_RUNTIME_LOG_MAX_BYTES=2097152` to change retention size

## Troubleshooting

### "Tool not found" or no graft tools visible

- Verify the CLI is installed: `npx @flyingrobots/graft --help`
- Verify the MCP transport starts: `npx @flyingrobots/graft serve`
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

### run_capture is disabled

If `run_capture` returns `run_capture is disabled by configuration`,
the server was started with shell capture turned off.

- local repo-scoped sessions can re-enable it by unsetting
  `GRAFT_ENABLE_RUN_CAPTURE=0`
- shared or harder security postures should generally leave it disabled

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
