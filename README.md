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

## Status

Early development. Not yet published.

## What it does

When an agent asks to read a file, Graft applies policy:

- **Small files** are returned as-is.
- **Large files** are returned as a structural outline with a jump
  table so the agent can request specific ranges.
- **Banned files** (binaries, lockfiles, minified bundles, secrets)
  are refused with a machine-readable reason code and suggested next
  steps.
- **Ranges** are bounded — no stealth `cat` of a 10,000-line file.
- **Session depth** tightens caps as the context window fills.
- **Tripwires** signal when the session is going off the rails.

Every decision is logged. Every refusal is explainable. All output
is structured JSON.

## Transport

- **MCP server** — works with any LLM that speaks MCP (primary).
- **Claude Code hooks** — enforced read policy for Claude Code
  sessions (primary).
- **CLI** — `graft` / `git graft` for debugging and testing.

## Commands (Phase 1)

| Command | Purpose |
|---|---|
| `safe_read` | Policy-enforced file read (content, outline, or refusal) |
| `file_outline` | Structural skeleton with jump table |
| `read_range` | Bounded range read (max 250 lines) |
| `run_capture` | Shell output capture — tee to log, tail to agent |
| `state_save` | Save session working state (max 8 KB) |
| `state_load` | Restore session working state |
| `doctor` | Runtime and config health check |
| `stats` | Decision metrics summary |

## License

Apache 2.0 — see [LICENSE](LICENSE).
