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
- 14 machine-stable reason codes.
- 136 tests across 12 test files.
- Repository scaffolding, METHOD structure, community files.
- Cycle 0001 design doc and retrospective.

### Fixed

- Add `@types/node` and `@types/picomatch` (required by TypeScript 6).
- Fix session-depth table in design doc ("Messages Remaining" →
  "Messages Elapsed").
