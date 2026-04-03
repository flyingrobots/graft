# Graft

Context governor for coding agents.

Graft enforces read policy so coding agents consume the smallest
structurally correct view of a codebase instead of dumping entire
files into their context window. Agent-first, but the structural
tools (outlines, diffs, symbol history) are useful to anyone.

## Why

Empirical analysis of 1,091 real coding sessions (Blacklight) found
that **Read accounts for 96.2 GB of context burden** — 6.6× all
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

## Setup (MCP)

Add to your MCP config (Claude Code, Cursor, etc.):

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

For Claude Code, add this to `.mcp.json` in your project root
or `~/.claude.json` globally.

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
- **Tripwires** signal when the session is going off the rails.
- **Receipts** on every response for usage analysis.

Every decision is logged. Every refusal is explainable. All output
is structured JSON.

## Tools

| Tool | Purpose |
|---|---|
| `safe_read` | Policy-enforced file read (content, outline, refusal, or diff) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines) |
| `graft_diff` | Structural diff between git refs (symbol-level, not line hunks) |
| `changed_since` | Check if a file changed since last read (peek or consume) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session working state (max 8 KB) |
| `state_load` | Restore session working state |
| `doctor` | Runtime health check |
| `stats` | Decision metrics summary |

## License

Apache 2.0 — see [LICENSE](LICENSE).
