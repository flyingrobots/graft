# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
- 16 machine-stable reason codes (added REREAD_UNCHANGED,
  CHANGED_SINCE_LAST_READ).
- 205 tests across 18 test files.
- Repository scaffolding, METHOD structure, community files.
- Cycle 0001 design doc and retrospective.
- Cycle 0002 design doc: MCP transport.

### Fixed

- **Diff path policy check**: the safe_read diff path now runs
  evaluatePolicy before returning structural data, preventing
  potential data leaks if policy rules evolve.
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
