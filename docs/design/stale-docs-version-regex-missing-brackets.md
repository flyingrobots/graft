---
title: "stale-docs checkVersionDrift regex does not match Keep a Changelog bracket format"
feature: docs-integrity
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# stale-docs checkVersionDrift regex does not match bracket format

## Relevance

Relevant. The repo uses Keep a Changelog-style bracketed headings, so version
drift checks must understand that format.

## Original Card

`CHANGELOG_VERSION_RE` in `src/warp/stale-docs.ts` matches `## 1.5.0` but not
`## [1.5.0] - 2026-01-01` (Keep a Changelog format with brackets). This repo's
own CHANGELOG uses the bracket format.

Fix: update the regex to optionally match brackets:

```text
/^##\s+\[?v?(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)\]?/m
```

Affected files:

- `src/warp/stale-docs.ts` line ~116

## Design

No code change was needed in this tranche because the regex and regression
tests had already landed. Revalidate and move the card out of active backlog.

## Tests

`test/unit/warp/stale-docs.test.ts` covers bracketed changelog headings.
