# Graft — Project Instructions

## What this is

Graft is a context governor for coding agents. It enforces read policy
so agents consume the smallest structurally correct view of a codebase.

- **npm**: `@flyingrobots/graft`
- **CLI**: `graft`, `git-graft`
- **Transport**: MCP server + Claude Code hooks + CLI
- **Parser**: tree-sitter (JS/TS first, Rust later)

## Architecture

```
src/
  policy/       read policy engine (dual threshold, bans, .graftignore)
  parser/       tree-sitter outline extraction
  operations/   command implementations (safe_read, file_outline, etc.)
  format/       output formatting (content, outline, refusal, error)
  metrics/      NDJSON decision logging
  hooks/        Claude Code hook integration
  mcp/          MCP server transport
```

## Internal vocabulary

These terms are internal doctrine, not public CLI names:

- **projection** — output mode chosen by policy (content/outline/refused/error)
- **focus** — file/class/method/range targeting
- **residual** — hidden context not surfaced to the model
- **receipt** — structured decision log entry
- **witness** — exact focus chosen + why + what larger whole it came from

## Commands (Phase 1)

| Command | Policy |
|---|---|
| `safe_read` | Dual threshold: 150 lines + 12 KB. Returns content, outline, or refusal. |
| `file_outline` | Always allowed. Output bounded per signature. |
| `read_range` | Max 250 lines, byte cap. No stealth cat. |
| `run_capture` | Tail limit (default 60 lines). |
| `state_save` | Max 8 KB. |
| `state_load` | Returns saved state or empty. |
| `doctor` | No policy. Diagnostic. |
| `stats` | No policy. Metrics summary. |

## Reason codes

Machine-stable enums, not prose. 13 codes defined in the design doc.

## Development

```bash
pnpm install
pnpm test          # vitest
pnpm lint          # eslint (strict)
```

Git hooks: `git config --local core.hooksPath scripts/hooks`

## Session start

1. `claude-think --recent --json` — reconstruct prior context.
2. Check `docs/method/backlog/asap/` — what's hot.
3. Check `.claude/bad_code.md` — anything in touched files.
4. Check `.claude/cool_ideas.md` — anything to surface.
