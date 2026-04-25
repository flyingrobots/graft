---
title: "Old git-based structural operations are dead code"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
---

# Old git-based structural operations are dead code

The MCP tools now use WARP-based implementations, but the old
git-log-based operation modules are still in the codebase:

- `src/operations/structural-churn.ts` — replaced by `src/warp/warp-structural-churn.ts`
- `src/operations/structural-log.ts` — replaced by `src/warp/warp-structural-log.ts`
- `src/warp/reference-count.ts` — replaced by `src/warp/warp-reference-count.ts`

Tests still import the old modules. Once tests are migrated, these
files can be deleted.
