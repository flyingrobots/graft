---
title: "drift-sentinel declares unused 'pattern' parameter"
feature: docs-integrity
kind: leaf
legend: CLEAN_CODE
effort: S
---

# drift-sentinel declares unused 'pattern' parameter

`DriftSentinelOptions.pattern` is declared in the interface but never
read in `runDriftSentinel`. Either wire it (filter which .md files to
check) or remove it.

Affected files:
- `src/warp/drift-sentinel.ts` line 14
