# Direct node:fs imports in tool handlers

Several tool handlers import `node:fs` directly instead of using
`ctx.fs` (the FileSystem port). This bypasses hexagonal architecture
and makes those handlers untestable with mock filesystems.

## Files

- `src/mcp/tools/safe-read.ts` — `fs.readFileSync` for cache check
- `src/mcp/tools/file-outline.ts` — `fs.readFileSync` for cache check
- `src/mcp/tools/changed-since.ts` — `fs.readFileSync` for policy check
- `src/mcp/tools/run-capture.ts` — `fs.mkdirSync`, `fs.writeFileSync`

## Fix

Use `ctx.fs.readFileSync()` for the sync reads. For run-capture's
`mkdirSync`/`writeFileSync`, add sync write methods to the
FileSystem port or use async equivalents.

## Why it exists

The tool handlers need synchronous reads for cache checks that
happen before the async operation. The FileSystem port has
`readFileSync` but the handlers import `node:fs` directly instead
of using the port.

Effort: S

Flagged by CodeRabbit on PR #19. Pre-existing since cycle 0010.
