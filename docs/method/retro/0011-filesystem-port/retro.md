---
title: "Cycle 0011 — FileSystem Port"
---

# Cycle 0011 — FileSystem Port

**Legend**: CLEAN_CODE
**Branch**: cycle/0011-filesystem-port
**Status**: complete

## Goal

Extract a portable FileSystem port interface so core logic (operations/,
metrics/) no longer imports node:fs directly. Hexagonal compliance.

## What shipped

- `src/ports/filesystem.ts` — FileSystem interface with overloaded
  readFile (string + Buffer), writeFile, appendFile, mkdir, stat,
  readFileSync
- `src/adapters/node-fs.ts` — Node.js singleton adapter
- ToolContext gains `readonly fs: FileSystem`, wired in server.ts
- All 5 core files migrated:
  - `operations/state.ts` — opts.fs.readFile/writeFile/mkdir
  - `operations/safe-read.ts` — options.fs.readFile (Buffer)
  - `operations/file-outline.ts` — opts.fs.readFile
  - `operations/read-range.ts` — opts.fs.readFile
  - `operations/graft-diff.ts` — opts.fs.readFileSync
- `metrics/logger.ts` — this.fs for all 5 methods

## Done criteria

| Criterion | Met? |
|-----------|------|
| Zero node:fs in operations/ | Yes |
| Zero node:fs in metrics/ | Yes |
| Core logic testable with mock filesystem | Yes |
| All existing tests pass | Yes (227) |

## Decisions

1. **readFileSync on the port** — graft-diff.ts is synchronous. Refactoring
   to async cascades into tool handler return types. readFileSync stays.
2. **appendFile on the port** — metrics logger needs it. Not in the original
   ticket interface but required by the code.
3. **MCP tool handlers keep node:fs** — they're infrastructure, not core
   logic. Done criteria only target operations/ and metrics/.
4. **fs is required, not optional** — no default adapter. Callers must
   explicitly pass the filesystem.

## Metrics

- 6 commits, tests green after each
- 2 new files (port + adapter)
- 5 core files + 1 metrics file migrated
- 5 tool handler files updated to pass ctx.fs (6 handler functions)
- 6 test files updated to pass nodeFs
