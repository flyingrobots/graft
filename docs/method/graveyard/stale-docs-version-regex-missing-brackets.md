---
title: "stale-docs checkVersionDrift regex does not match Keep a Changelog bracket format"
feature: docs-integrity
kind: leaf
legend: CLEAN_CODE
effort: S
disposition: completed
retired_by: "d368a82 chore(backlog): clear bad-code lane tranche"
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# stale-docs checkVersionDrift regex does not match bracket format

## Disposition

Completed in `d368a82`. The original card was moved from
`docs/method/backlog/bad-code/` to the graveyard to preserve the backlog record.

`CHANGELOG_VERSION_RE` in `src/warp/stale-docs.ts` matches `## 1.5.0`
but not `## [1.5.0] - 2026-01-01` (Keep a Changelog format with
brackets). This repo's own CHANGELOG uses the bracket format.

Fix: update the regex to optionally match brackets:
```
/^##\s+\[?v?(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)\]?/m
```

Affected files:
- `src/warp/stale-docs.ts` line ~116
