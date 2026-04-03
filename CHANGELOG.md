# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-04-03

### Changed

- **Server decomposition** (cycle 0010): split 541-line MCP server
  god file into focused modules. `server.ts` is now 110 lines of pure
  registration and plumbing. New modules:
  - `metrics.ts` — `Metrics` class replaces 6 loose counters
  - `cache.ts` — `Observation` class + `ObservationCache` with
    `isStale()`, `touch()`, `record()`, `check()`, `get()`
  - `receipt.ts` — `buildReceiptResult()` with stabilization loop
  - `context.ts` — `ToolContext` interface + `ToolHandler` type
  - `tools/*.ts` — 9 files, one per tool handler (state.ts has both
    save + load)
- **FileSystem port** (cycle 0011): hexagonal compliance — core logic
  no longer imports `node:fs` directly. New `FileSystem` interface in
  `src/ports/filesystem.ts` with Node adapter in `src/adapters/node-fs.ts`.
  All operations and metrics use the port; testable with mock filesystems.
- **Outline quality audit** (cycle 0012): 7 real-world fixture files,
  40 test assertions proving outline extraction works on React
  components, Express routers, barrel files, god classes, dense
  generics, and decorated classes.

### Added

- **Arrow function export extraction**: `export const fn = () => {}`
  now gets `kind: "function"` with parameter/return type signature
  instead of generic `kind: "export"`.
- **Enum extraction**: `enum` declarations appear in outlines with
  `kind: "enum"`.
- **Re-export extraction**: named, type, and wildcard re-exports
  now appear in outlines. Barrel files are no longer invisible.
- **Claude Code hooks enforcement** (cycle 0015): PreToolUse hook
  intercepts `Read` calls and routes them through graft's policy
  engine. Agents get content, outlines, or refusals automatically
  without needing to use MCP tools explicitly.

### Fixed

- **Byte metrics**: receipt builder now uses `Buffer.byteLength()`
  instead of `text.length` for returnedBytes and cumulative byte
  accounting. Was counting UTF-16 code units as bytes.
- **Path traversal guard**: all path-accepting tools now use
  `ctx.resolvePath()` which rejects relative paths that escape the
  project root via `..` segments.
- **Doctor thresholds drift**: doctor tool now imports
  `STATIC_THRESHOLDS` from policy instead of hardcoding values.
- **run_capture tail validation**: clamp tail to minimum 1 to prevent
  zero/negative values from producing undefined behavior.
- **safe_read result.actual guard**: check `result.actual !== undefined`
  before using it for cache recording (actual is optional on error
  projections).

## [0.1.0] - 2026-04-03

### Added

- **Policy engine**: dual thresholds (150 lines + 12 KB), 5 ban
  categories (binary, lockfile, minified, build output, secret),
  `.graftignore` support, session-depth dynamic caps (20/10/4 KB).
- **Parser**: tree-sitter WASM outline extraction for JS/TS with
  jump tables, signature bounding, and broken-file recovery.
- **Session tracker**: 4 tripwires (SESSION_LONG, EDIT_BASH_LOOP,
  RUNAWAY_TOOLS, LATE_LARGE_READ) with session depth reporting.
- **Metrics logger**: NDJSON decision logging with retention/rotation.
- **Operations**: safe_read, file_outline, read_range, state_save/load.
- **MCP server**: all 8 Phase 1 commands as MCP tools over stdio,
  session tracking (tripwires + dynamic caps automatic), doctor and
  stats tools. Entry point at `src/mcp/stdio.ts`.
- **Re-read suppression**: session-level observation cache — second
  read of an unchanged file returns cached outline instead of
  re-reading. Tracks readCount, estimatedBytesAvoided, lastReadAt.
  Works for both safe_read and file_outline. Stats includes
  totalCacheHits and totalBytesAvoidedByCache.
- **Receipt mode**: every MCP response includes a `_receipt` block
  with sessionId, monotonic seq, projection, reason, fileBytes,
  returnedBytes, and cumulative counters (reads, outlines, refusals,
  cacheHits, bytesReturned, bytesAvoided). Blacklight can grep API
  transcripts to prove graft works.
- **Changed-since-last-read**: when a file changes between reads,
  graft returns a structural diff (added/removed/changed symbols)
  alongside the new outline. New `changed_since` MCP tool for
  explicit delta queries without triggering a full safe_read.
- Now 16 machine-stable reason codes — added `REREAD_UNCHANGED`
  (cycle 0003) and `CHANGED_SINCE_LAST_READ` (cycle 0005).
- **Structural git diff** (`graft_diff`): symbol-level diff between
  any two git refs. Uses `git rev-parse --verify` + `git cat-file -e`
  for stable ref/object detection.
- **run_capture implemented**: tee shell output to log file, return
  last N lines. Full output at `.graft/logs/capture.log`.
- **MCP tool descriptions**: all 10 tools have agent-facing
  descriptions in their schema for discovery via `listTools`.
- **bin/graft.js**: CLI entry point for `npx @flyingrobots/graft`.
- 16 machine-stable reason codes.
- 227 tests across 20 test files.
- 7 cycles completed, 3 legends (CORE, WARP, CLEAN_CODE).

### Fixed

- **Diff path policy check**: both `safe_read` and `changed_since`
  now run `evaluatePolicy` before returning structural data,
  preventing leaks if policy rules change after initial observation.
  Note: `safe_read` always evaluates policy; `changed_since` was
  added in this release and now also evaluates policy.
- **Nested symbol diff**: classes/interfaces now recursively diff
  children. A method added inside a class shows as a changed class
  with a childDiff detailing the nested change.
- **Snapshot race**: diff and changed_since paths now use
  extractOutline with the already-read content instead of
  re-reading the file via fileOutline.
- **Pre-push hook**: parses stdin for the remote ref being pushed to
  instead of checking the local branch name.
- **oldSignature consistency**: DiffEntry.oldSignature now uses the
  same entrySignature fallback (name when no signature) as the
  comparison logic.
- **Stale lastReadAt**: diff responses now return the updated
  timestamp from the observation cache instead of the old one.
- **Dead DiffEntry fields**: removed unused start/end from DiffEntry.
- Add `@types/node` and `@types/picomatch` (required by TypeScript 6).
- Fix session-depth table in design doc ("Messages Remaining" →
  "Messages Elapsed").
