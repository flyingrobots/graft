# Graft — Project Instructions

## What this is

Graft is a context governor for coding agents. Agent-first — the
primary surface is MCP tools, not a terminal UI. But the structural
tools (outlines, diffs, symbol history) are useful to anyone.

Empirical basis: 96.2 GB Read burden across 1,091 sessions
(Blacklight, ~/git/blacklight/LLM_TOKEN_USE.md).

- **npm**: `@flyingrobots/graft`
- **Primary surface**: MCP server + Claude Code hooks
- **Secondary**: CLI (`graft`, `git-graft`) for debugging/testing
- **Parser**: web-tree-sitter WASM (JS/TS first, Rust later)
- **Output**: Structured JSON. No pretty terminal formatting.

## Architecture

```
src/
  policy/       read policy engine (thresholds, bans, session depth)
  parser/       tree-sitter outline extraction (WASM)
  operations/   command implementations
  format/       output formatting (JSON structured responses)
  metrics/      NDJSON decision logging
  session/      session tracking, tripwires
  hooks/        Claude Code hook integration
  mcp/          MCP server transport
```

## Internal vocabulary

These terms are internal doctrine, not public API names:

- **projection** — output mode chosen by policy (content/outline/refused/error)
- **focus** — file/class/method/range targeting
- **residual** — hidden context not surfaced to the model
- **receipt** — structured decision log entry
- **witness** — exact focus chosen + why + what larger whole it came from

## Commands (Phase 1)

| Command | Policy |
|---|---|
| `safe_read` | Dual threshold: 150 lines + 12 KB (static). Dynamic session-depth cap (20/10/4 KB). |
| `file_outline` | Always allowed. Output bounded. Includes jump table. |
| `read_range` | Max 250 lines, byte cap. No stealth cat. |
| `run_capture` | Tee to log + tail (default 60 lines). |
| `state_save` | Max 8 KB. |
| `state_load` | Returns saved state or empty. |
| `doctor` | No policy. Diagnostic. |
| `stats` | No policy. Metrics summary. |

## Reason codes

Machine-stable enums, not prose. 14 codes defined in the design doc.

## Tripwires

| Signal | Threshold |
|---|---|
| `SESSION_LONG` | > 500 messages |
| `EDIT_BASH_LOOP` | > 30 edit↔bash transitions |
| `RUNAWAY_TOOLS` | > 80 tool calls since last user message |
| `LATE_LARGE_READ` | Output > 20 KB after 300 messages |

## Repo rules

### Systems-Style JavaScript Scorecard

At the end of every turn where JavaScript/TypeScript source files
were modified, provide a scorecard for each modified file:

```
### file: src/example/foo.ts
| Dimension | Score | Notes |
|-----------|-------|-------|
| Runtime truth (P1) | 🟡 | PolicyResult is still a plain object |
| Boundary validation (P2) | 🟢 | zod schema at MCP edge |
| Behavior on type (P3) | 🔴 | switch on projection string |
| SOLID | 🟡 | SRP ok, OCP needs work |
| DRY | 🟢 | detectLang shared |
Remarks: ...
Suggestions: ...
```

Scores: 🟢 good, 🟡 needs work, 🔴 violation.

Automatically adjust the backlog with any actionable findings.

### Coding standard

See [STYLE.md](STYLE.md) for Systems-Style JavaScript application
to this project. New code follows the standard. Existing code
migrates incrementally under the CLEAN_CODE legend.

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
3. Check `docs/method/backlog/bad-code/` — anything in touched files.
4. Check `docs/method/backlog/cool-ideas/` — anything to surface.
