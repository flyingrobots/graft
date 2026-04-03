# Cycle 0015 — Claude Code Hooks

**Legend**: CORE
**Branch**: cycle/0015-claude-code-hooks
**Status**: complete

## Goal

Enforce graft's read policy on Claude Code's native Read tool via
PreToolUse hooks. The agent gets graft-controlled responses without
needing to use MCP tools explicitly.

## What shipped

- `src/hooks/pretooluse-read.ts` — PreToolUse hook script that
  intercepts Read calls, evaluates policy, and returns content,
  outlines, or refusals via stderr (exit code 2)
- `.claude/settings.json` — committable hooks configuration
- `.gitignore` updated to allow `.claude/settings.json` while
  keeping `settings.local.json` and other Claude dirs ignored
- GUIDE.md hooks section with setup, behavior, limitations
- 13 tests covering content, outline, refusal, error, graftignore,
  and non-parseable file paths

## How it works

1. Agent calls `Read(file_path)`
2. Hook fires, reads file, evaluates `evaluatePolicy()`
3. Exit 2 (block) with result in stderr:
   - Content: file text for small files / non-JS/TS files
   - Outline: structural skeleton + jump table for large JS/TS
   - Refusal: reason code + next steps for banned files
4. Agent receives graft's response in the denial message

## Decisions

1. **Block + inline result** — hooks can't swizzle responses, so
   we block and provide the result in stderr. Agent gets the data
   in one round-trip.
2. **Stateless policy only** — hook runs as a subprocess, can't
   share MCP server state. No session caps, no cache, no diffs.
   The hook is the first line of defense; MCP tools are the full
   governor.
3. **Non-JS/TS fallback to content** — files without a parseable
   language get content pass-through regardless of size, since
   tree-sitter can't extract outlines from them.
4. **Committable settings.json** — `.gitignore` updated to allow
   `.claude/settings.json` so teams can share hook config.

## Metrics

- 4 commits
- 1 new file (hook script), 1 new test file
- 13 new tests (282 total, up from 269)
- Bug found and fixed during dogfooding (non-JS/TS empty outline)
