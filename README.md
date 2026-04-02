# Graft

Replay-safe structural reads for coding agents.

Graft is a **context governor** — it enforces read policy so coding
agents consume the smallest lawful view of a codebase instead of
dumping entire files into their context window.

## Status

Early development. Not yet published.

## What it does

When an agent asks to read a file, Graft applies policy:

- **Small files** are returned as-is.
- **Large files** are returned as a structural outline (signatures,
  exports, class shapes) with suggested next steps.
- **Banned files** (binaries, lockfiles, minified bundles, secrets)
  are refused with a machine-readable reason code.
- **Ranges** are bounded — no stealth `cat` of a 10 000-line file.

Every decision is logged. Every refusal is explainable.

## Transport

- **MCP server** — works with any LLM that speaks MCP.
- **Claude Code hooks** — enforced read policy for Claude Code
  sessions.
- **CLI** — `graft` / `git graft` for human use.

## Commands (Phase 1)

| Command | Purpose |
|---|---|
| `safe_read` | Policy-enforced file read (content, outline, or refusal) |
| `file_outline` | Structural skeleton — signatures, no bodies |
| `read_range` | Bounded range read (max 250 lines) |
| `run_capture` | Shell output capture with tail limit |
| `state_save` | Save session working state (capped) |
| `state_load` | Restore session working state |
| `doctor` | Runtime and config health check |
| `stats` | Decision metrics summary |

## License

Apache 2.0 — see [LICENSE](LICENSE).
