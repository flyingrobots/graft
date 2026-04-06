<div align="center">
    <img src="./docs/assets/graft.svg" />
    <h3>Context governor for coding agents</h3>
</div>

Graft enforces read policy so coding agents consume the smallest
structurally correct view of a codebase instead of dumping entire
files into their context window. Agent-first, but the structural
tools (outlines, diffs, symbol history) are useful to anyone.

**v0.4.0** — now with WARP: structural memory over git history.

## Why

Empirical analysis of 1,091 real coding sessions ([Blacklight](https://github.com/flyingrobots/blacklight)) found
that **Read accounts for 96.2 GB of context burden** — 6.6x all
other tools combined. 58% of reads are full-file. The fattest 2.4%
of reads produce 24% of raw bytes. Dynamic read caps + session
management reduce this by **75.1%**.

## Install

```bash
npm install -g @flyingrobots/graft
```

Or use directly:

```bash
npx @flyingrobots/graft
```

Or run in Docker (no Node required):

```bash
docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft
```

## Quick start

```bash
npx @flyingrobots/graft init
```

Scaffolds `.graftignore`, adds `.graft/` to `.gitignore`, generates
a `CLAUDE.md` snippet telling agents to prefer graft tools, and
prints Claude Code hook config.

Then add graft to your MCP config:

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

Works with Claude Code, Cursor, Windsurf, Continue, Cline, and
any MCP-compatible client.

See **[Setup Guide](docs/GUIDE.md)** for per-editor instructions,
Claude Code hooks, `.graftignore` configuration, troubleshooting,
and details on what the agent experiences.

## What it does

When an agent asks to read a file, Graft applies policy:

- **Small files** are returned as-is.
- **Large files** are returned as a structural outline with a jump
  table so the agent can request specific ranges.
- **Banned files** (binaries, lockfiles, minified bundles, secrets)
  are refused with a machine-readable reason code and suggested next
  steps.
- **Re-reads** of unchanged files return a cached outline (no wasted
  context). Changed files return a structural diff (added/removed/
  changed symbols).
- **Ranges** are bounded — no stealth `cat` of a 10,000-line file.
- **Session depth** tightens caps as the context window fills.
- **Budget governor** — agent declares a byte budget, thresholds
  tighten as it drains. No single read may consume more than 5% of
  remaining budget.
- **Structural memory** — WARP-backed structural history across git
  commits. Query what changed structurally without reading files.
- **Tripwires** signal when the session is going off the rails.
- **Receipts** on every response with compression ratio for usage
  analysis.

Every decision is logged. Every refusal is explainable. All output
is structured JSON.

## Tools

| Tool | Purpose |
|---|---|
| `safe_read` | Policy-enforced file read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines), policy-gated |
| `graft_diff` | Structural diff between git refs with per-file summary lines |
| `graft_since` | Structural changes since a git ref — symbols added/removed/changed |
| `graft_map` | Structural map of a directory — all files and symbols in one call |
| `changed_since` | Check if a file changed since last read (peek or consume) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session working state (max 8 KB) |
| `state_load` | Restore session working state |
| `set_budget` | Declare session byte budget — governor tightens as it drains |
| `explain` | Human-readable help for any reason code |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |

## Claude Code hooks

Two hooks work alongside the MCP server to govern native `Read`
calls — a safety net for when agents bypass graft's tools:

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

Add to `.claude/settings.json` in your project root.
**PreToolUse** blocks banned files before the read.
**PostToolUse** shows the agent what `safe_read` would have saved.

See the **[Setup Guide](docs/GUIDE.md)** for full details on hooks,
per-editor MCP config, `.graftignore`, and troubleshooting.

## CLI

```bash
npx @flyingrobots/graft init      # scaffold project for graft
npx @flyingrobots/graft index     # index git history into WARP
```

## Reason codes

Every refusal or policy decision includes a machine-readable reason
code. Use `explain(code)` to get meaning and recommended action.

| Code | Meaning |
|------|---------|
| `CONTENT` | File within thresholds — full content returned |
| `OUTLINE` | File exceeds thresholds — structural outline returned |
| `SESSION_CAP` | Session-depth byte cap triggered |
| `BUDGET_CAP` | Budget-proportional cap triggered |
| `BINARY` | Binary file refused |
| `LOCKFILE` | Machine-generated lockfile refused |
| `MINIFIED` | Minified file refused |
| `BUILD_OUTPUT` | Build output directory refused |
| `SECRET` | Potential secrets file refused |
| `GRAFTIGNORE` | Matches .graftignore pattern |

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

```ts
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣾⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣶⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣤⣴⣶⣶⣶⣶⣦⣤⣼⣿⣿⣿⣿⣿⠀⢠⣶⣶⣦⡀⠀⢀⣴⣶⣶⣤⠀⠀⠀⠀⣀⣤⣴⣶⣶⣶⣶⣦⣄⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⡄⠀⣀⣀⣠⣤⠀⠀⢀⣾⣿⣿⣀⣀⣀⣤⣤⣄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣴⣿⣿⠛⠉⠉⠉⠛⠿⣿⣿⣿⡿⠉⠉⠀⠀⢻⣿⣿⣿⣇⠀⣾⣿⣿⣿⣿⡇⠀⢠⣾⣿⣿⣿⡿⠟⠛⢻⣿⣿⣷⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢸⣿⣿⣇⠀⠀⠀⠀⠀⠀⠘⣿⣿⡇⠀⠀⠀⠀⠈⢿⣿⣿⣿⢠⡿⠛⠛⠿⠟⠁⠀⢺⣿⣿⡿⠋⠀⠀⠀⣸⣿⣿⣿⡀⠀⠀⠀⠀⠛⠿⢿⣿⣿⠟⠛⠛⠛⠛⠀⠘⠻⠿⢿⣿⣿⠛⠛⠛⠛⠋⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠸⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⢻⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠉⠉⠀⠀⠀⣠⣾⠟⢻⣿⣿⡇⠀⠀⠀⠀⠀⠀⠈⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣶⣤⣤⣤⣾⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⡿⠋⠀⢸⣿⣿⡇⠀⢀⣤⡀⠀⠀⠀⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⡆⠀⠀⠀⢀⣀⡀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣨⣿⡿⠟⠛⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⡏⠀⠀⠀⢸⣿⣿⡇⠀⢸⣿⡇⠀⠀⠀⢻⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣇⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣼⣿⣿⡀⠀⢀⣀⣀⣤⣤⣤⣴⣦⣤⣄⠀⠀⠀⠀⢰⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⢾⣿⣿⣇⠀⠀⣠⣿⢻⣿⣿⡀⣸⣿⡇⠀⠀⠀⠸⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣦⣀⣠⣾⣿⡟⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⢸⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⠏⠀⢿⣿⣿⣿⣿⠇⠀⠀⠀⠀⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⠟⠉⠁⠀⠀⠀⠀⠀⢻⣿⣿⡟⠀⠀⠀⠈⠉⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠛⠛⠛⠁⠀⠀⠀⠙⠛⠛⠁⠀⠀⠀⠀⠀⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⠛⠋⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣷⣤⣤⣤⣤⣤⣾⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠻⠿⠿⠿⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠿⠿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
```