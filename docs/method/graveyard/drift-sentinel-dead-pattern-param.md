---
title: "drift-sentinel declares unused 'pattern' parameter"
feature: docs-integrity
kind: leaf
legend: CLEAN_CODE
effort: S
disposition: completed
retired_by: "d368a82 chore(backlog): clear bad-code lane tranche"
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
---

# drift-sentinel declares unused 'pattern' parameter

## Disposition

Completed in `d368a82`. The original card was moved from
`docs/method/backlog/bad-code/` to the graveyard to preserve the backlog record.

`DriftSentinelOptions.pattern` is declared in the interface but never
read in `runDriftSentinel`. Either wire it (filter which .md files to
check) or remove it.

Affected files:
- `src/warp/drift-sentinel.ts` line 14
