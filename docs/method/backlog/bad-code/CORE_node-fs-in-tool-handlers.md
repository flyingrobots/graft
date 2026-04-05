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

### Simple (safe-read, file-outline, changed-since)

Replace `fs.readFileSync(path, "utf-8")` with
`ctx.fs.readFileSync(path, "utf-8")`. The port already exposes
this method.

### Complex (run-capture)

The handler uses `fs.mkdirSync` and `fs.writeFileSync`, which are
not in the FileSystem port. Prefer refactoring to async equivalents
(`ctx.fs.mkdir`, `ctx.fs.writeFile`), which already exist in the
port. Only extend the port with sync methods if async refactoring
is architecturally infeasible.

## Why it exists

The tool handlers need synchronous reads for cache checks that
happen before the async operation. The FileSystem port has
`readFileSync` but the handlers import `node:fs` directly instead
of using the port.

Effort: S (simple handlers), S-M (run-capture async refactor)

Flagged by CodeRabbit on PR #19. Pre-existing since cycle 0010.
