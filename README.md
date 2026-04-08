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
prints Claude Code hook / MCP config for manual setup.

For a project-local one-step bootstrap, use explicit write flags:

```bash
npx @flyingrobots/graft init --write-claude-mcp --write-claude-hooks
npx @flyingrobots/graft init --write-cursor-mcp
npx @flyingrobots/graft init --write-windsurf-mcp
npx @flyingrobots/graft init --write-continue-mcp
npx @flyingrobots/graft init --write-cline-mcp
npx @flyingrobots/graft init --write-codex-mcp
```

These writes are idempotent. Existing JSON / TOML config is merged
without duplicating graft entries.

Then add graft to your MCP config:

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

Works with Codex, Claude Code, Cursor, Windsurf, Continue, Cline,
and any MCP-compatible client.

See the **[Setup decision table](docs/GUIDE.md#choose-your-setup-path)**
for the fastest path by client and mode, and the full
**[Setup Guide](docs/GUIDE.md)** for per-editor instructions, Claude
Code hooks, `.graftignore` configuration, troubleshooting, and
details on what the agent experiences. Contributors should also read
**[Architecture](ARCHITECTURE.md)** for the runtime systems map and
**[Code of Conduct](CODE_OF_CONDUCT.md)** for project participation
expectations.

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
- **Versioned schemas** on every machine-readable MCP / CLI payload.

Every decision is logged. Every refusal is explainable. All output
is structured JSON with versioned `_schema` metadata.

## Tools

| Tool | Purpose |
|---|---|
| `safe_read` | Policy-enforced file read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines), policy-gated |
| `graft_diff` | Structural diff between git refs with per-file summary lines and explicit denied-file reporting |
| `graft_since` | Structural changes since a git ref — symbols added/removed/changed with explicit denied-file reporting |
| `graft_map` | Structural map of a directory — all files and symbols in one call, with explicit denied-file reporting |
| `code_show` | Focus on a symbol by name — get its source code in one call |
| `code_find` | Search symbols across the project by approximate name or glob, with optional kind/path filters |
| `code_refs` | Search import sites, callsites, property access, or literal text references with explicit text-fallback provenance |
| `changed_since` | Check if a file changed since last read (peek or consume) |
| `run_capture` | Diagnostic shell-output escape hatch — tail to agent, optional redacted log persistence, explicit enable/disable posture, outside bounded-read policy, with explicit `policyBoundary` marker |
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
**PreToolUse** blocks banned files and redirects large JS/TS reads to
`safe_read` before native `Read` can dump them into context.
**PostToolUse** is the backstop: it reports what `safe_read` would have
saved when an oversized code read still slips through.

See the **[Setup Guide](docs/GUIDE.md)** for full details on hooks,
per-editor MCP config, `.graftignore`, and troubleshooting.

## CLI

```bash
npx @flyingrobots/graft init
npx @flyingrobots/graft init --write-claude-mcp --write-claude-hooks
npx @flyingrobots/graft init --write-cursor-mcp
npx @flyingrobots/graft init --write-windsurf-mcp
npx @flyingrobots/graft init --write-continue-mcp
npx @flyingrobots/graft init --write-cline-mcp
npx @flyingrobots/graft init --write-codex-mcp
npx @flyingrobots/graft serve
npx @flyingrobots/graft index
npx @flyingrobots/graft read safe src/app.ts --json
npx @flyingrobots/graft read outline README.md --json
npx @flyingrobots/graft read range src/app.ts --start 10 --end 40 --json
npx @flyingrobots/graft read changed src/app.ts --json
npx @flyingrobots/graft struct diff --json
npx @flyingrobots/graft struct since HEAD~3 --json
npx @flyingrobots/graft struct map src --json
npx @flyingrobots/graft symbol show createServer --path src/mcp/server.ts --json
npx @flyingrobots/graft symbol find 'create*' --json
npx @flyingrobots/graft diag doctor --json
npx @flyingrobots/graft diag explain CONTENT --json
npx @flyingrobots/graft diag stats --json
npx @flyingrobots/graft diag capture --tail 20 -- pnpm test --json
```

The CLI now mirrors the core MCP product surface through grouped
namespaces:
- `read` for bounded reads
- `struct` for structural navigation
- `symbol` for precision lookup
- `diag` for diagnostics

`init` and `index` remain explicit CLI-only commands. MCP responses and
CLI peer commands both carry versioned `_schema` metadata, and declared
output contracts live in `src/contracts/output-schemas.ts`.

`run_capture` remains an explicit shell escape hatch. For shared or
release-sensitive environments, you can disable it with
`GRAFT_ENABLE_RUN_CAPTURE=0`. Persisted capture logs can be disabled
with `GRAFT_RUN_CAPTURE_PERSIST=0`, and persisted output is redacted for
obvious secret-shaped values by default.

## Reason codes

Every refusal or policy decision includes a machine-readable reason
code. Use `explain(code)` to get meaning and recommended action.

| Code | Meaning |
|------|---------|
| `CONTENT` | File within thresholds — full content returned |
| `OUTLINE` | File exceeds thresholds — structural outline returned |
| `SESSION_CAP` | Session-depth byte cap triggered |
| `BUDGET_CAP` | Budget-proportional cap triggered |
| `UNSUPPORTED_LANGUAGE` | No parser-backed outline for this file type |
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
