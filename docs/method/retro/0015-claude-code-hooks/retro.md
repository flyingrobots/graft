# Cycle 0015 — Claude Code Hooks

**Legend**: CORE
**Branch**: cycle/0015-claude-code-hooks
**Status**: complete

## Goal

Govern Claude Code's native Read tool via hooks. Two-hook
architecture: PreToolUse blocks banned files, PostToolUse educates
agents on context cost after large file reads.

## What shipped

- `src/hooks/pretooluse-read.ts` — PreToolUse hook that intercepts
  Read calls, evaluates policy, and blocks banned files (exit 2).
  Everything else passes through (exit 0).
- `src/hooks/posttooluse-read.ts` — PostToolUse hook that fires
  after Read completes. Tells the agent what safe_read would have
  returned and the context savings. Never blocks (exit 0).
- `src/hooks/shared.ts` — shared utilities: validated input parsing,
  stdin reader with 1 MB size guard, safe relative path resolution,
  runHook harness with full stack trace logging.
- `.claude/settings.json` — committable hooks configuration for
  both PreToolUse and PostToolUse on Read.
- `.gitignore` updated to allow `.claude/settings.json` while
  keeping `settings.local.json` and other Claude dirs ignored.
- GUIDE.md hooks section with setup, behavior, limitations.
- 33 tests across 3 test files covering ban enforcement, education
  feedback, input validation, path safety, and edge cases.

## How it works

### PreToolUse (ban enforcement)
1. Agent calls `Read(file_path)`
2. Hook fires, reads file, evaluates `evaluatePolicy()`
3. If refused (binary, lockfile, secret, .graftignore): exit 2
   with refusal reason + next steps in stderr
4. Everything else: exit 0 — let native Read proceed

### PostToolUse (education)
1. After Read completes, hook fires
2. Evaluates what safe_read would have done
3. If the file would have gotten an outline projection: tells the
   agent the context cost and savings
4. Small files, non-JS/TS, nonexistent: no feedback (exit 0)

## Architecture evolution

1. **First attempt**: block ALL reads, return graft content in
   stderr — broke Edit/Write workflows, agent bypassed with cat.
2. **Second attempt**: block for outline+refusal, allow content —
   outline path still broke editing.
3. **Final approach**: PreToolUse blocks ONLY bans (security).
   PostToolUse EDUCATES on large files (behavioral nudge).

Key insight from James: "how can we make you WANT to use the MCP
instead?" — enforcement doesn't work because agents bypass it.
Education + better tools = behavioral change.

## Decisions

1. **Two hooks, not one** — PreToolUse for hard enforcement
   (security bans), PostToolUse for soft guidance (context cost).
2. **Stateless policy only** — hooks run as subprocesses, can't
   share MCP server state. No session caps, cache, or diffs.
3. **Shared module** — extracted after code review to eliminate
   boilerplate duplication between the two hooks.
4. **Committable settings.json** — `.gitignore` updated to allow
   `.claude/settings.json` so teams can share hook config.

## Metrics

- 15 commits
- 3 source files, 3 test files, 1 test helper
- 38 new tests
- 3 rounds of CodeRabbit review, 28 issues resolved
- Bug found and fixed during dogfooding (non-JS/TS empty outline)
