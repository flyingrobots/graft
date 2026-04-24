# Retro: stale-docs-version-regex-fix

## What shipped

Fixed CHANGELOG_VERSION_RE to support bracket format: `## [1.0.0]`.

## Playback

One-line regex change. Tests verify both bracket and non-bracket formats.
All acceptance criteria met.

## Drift check

No architecture concerns — one regex constant changed. ✅
