# Core logic depends on Node APIs directly

The Systems-Style JavaScript standard requires hexagonal
architecture: core logic behind portable ports, host-specific APIs
in adapters only. Currently graft's core is tangled with Node:

- `src/mcp/server.ts`: uses `node:fs`, `node:crypto`, `node:path`
  directly in tool handlers
- `src/operations/safe-read.ts`: uses `node:fs/promises`
- `src/operations/file-outline.ts`: uses `node:fs/promises`
- `src/operations/read-range.ts`: uses `node:fs/promises`
- `src/operations/state.ts`: uses `node:fs/promises`, `node:path`
- `src/git/diff.ts`: uses `node:child_process`
- `src/metrics/logger.ts`: uses `node:fs`, `node:path`
- `src/parser/outline.ts`: uses `node:module` (createRequire)

## What should be ports

- FileSystem port: read, write, stat, exists
- Crypto port: hash
- Git port: changedFiles, fileAtRef
- Clock port: now() for timestamps

Core logic (policy, parser, diff) should speak only in portable
terms. Node adapters implement the ports.

## Why it matters

Browser-first portability. The policy engine and parser could run
in a browser or Deno with zero changes — if they didn't import
node:fs. Currently they can't.

## Priority

Not blocking 0.1.0. The current code works. But this prevents
browser deployment and makes testing harder (can't mock fs without
monkeypatching).

Affects: all `src/` files
