# Retro: stale-docs-version-regex-missing-brackets

## What shipped

Fixed CHANGELOG_VERSION_RE in `src/warp/stale-docs.ts` to support
Keep a Changelog bracket format (`## [1.0.0]` in addition to `## 1.0.0`).

One-line regex change: added optional `\[?` and `\]?` around the
version capture group.

## Tests (2)

1. Bracket format match: `## [1.0.0] - 2026-01-01` → version 1.0.0
2. Bracket format mismatch: `## [1.5.0]` vs package 2.0.0 → drifted

## Cycle executed

Full RED → GREEN cycle (cycle 6). Tests written first, then fix applied.
