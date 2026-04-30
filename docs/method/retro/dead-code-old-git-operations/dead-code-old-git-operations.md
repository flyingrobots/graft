---
title: "Old git-based structural operations are dead code"
cycle: "dead-code-old-git-operations"
design_doc: "docs/design/dead-code-old-git-operations.md"
source_backlog: "docs/method/backlog/bad-code/dead-code-old-git-operations.md"
outcome: hill-met
drift_check: yes
---

# Old git-based structural operations are dead code Retro

## What shipped

The legacy git-log-backed structural history operation modules were removed:

- `src/operations/structural-log.ts`
- `src/operations/structural-churn.ts`

Their public output types moved to the WARP modules that now own the runtime
implementations:

- `StructuralLogEntry` and `StructuralLogSymbolChange` live in
  `src/warp/warp-structural-log.ts`
- `ChurnEntry` and `StructuralChurnResult` live in
  `src/warp/warp-structural-churn.ts`

The MCP churn tool now serializes the WARP result through the shared
`toJsonObject` helper instead of importing a serializer from the deleted
operation module.

## Playback

- `graft_log` and `graft_churn` remain covered by WARP unit tests.
- The v0.7.0 structural history playback now checks WARP-native log/churn files.
- Playback also asserts that the old structural log/churn operation files are
  absent, so the false architecture cannot quietly return.

## Drift

No new backlog cards were filed. The cycle removed the last bad-code lane card
and updated the active backlog graph so the bad-code lane no longer advertises
work that has already been completed.

## Verification

| Command | Result |
|---|---|
| `pnpm exec vitest run test/unit/warp/warp-structural-log.test.ts test/unit/warp/warp-structural-churn.test.ts tests/playback/CORE_v070-structural-history.test.ts test/unit/contracts/output-schemas.test.ts` | pass: 4 files, 29 tests |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm guard:agent-worktrees` | pass |
| `pnpm test` | pass: 172 files, 1341 tests |
| `git diff --check` | pass |
