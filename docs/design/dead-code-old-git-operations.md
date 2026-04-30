---
title: "Old git-based structural operations are dead code"
feature: structural-queries
kind: leaf
legend: CLEAN_CODE
effort: S
source_lane: bad-code
cycle: dead-code-old-git-operations
status: completed
retro: "docs/method/retro/dead-code-old-git-operations/dead-code-old-git-operations.md"
---

# Old git-based structural operations are dead code

## Relevance

Relevant. `graft_log` and `graft_churn` are WARP-backed now; keeping the
pre-WARP git-log operation modules creates a false implementation surface and
keeps tests alive for behavior that runtime tools no longer use.

## Original Card

The MCP tools now use WARP-based implementations, but the old git-log-based
operation modules are still in the codebase:

- `src/operations/structural-churn.ts` — replaced by `src/warp/warp-structural-churn.ts`
- `src/operations/structural-log.ts` — replaced by `src/warp/warp-structural-log.ts`

Tests still import the old modules. Once tests are migrated, these files can be
deleted.

## IBM Design Thinking

### Hills

- A maintainer can inspect structural history code and find only the WARP-backed
  log/churn implementations.
- `graft_log` and `graft_churn` keep their output contracts without importing
  dead operation modules.
- Playback tests assert the current architecture instead of preserving the old
  git-backed shape.

### Sponsor Users

- Agents using structural history tools during backlog cycles.
- Maintainers preparing the v0.7.0 release branch.

### Playback

- Do `src/operations/structural-log.ts` and
  `src/operations/structural-churn.ts` still exist?
- Do any source or active unit tests import the deleted operation modules?
- Do WARP structural log/churn tests still cover the behavior?
- Does the v0.7.0 playback test assert WARP-native log/churn tools?

## RED

Deleting the old modules initially breaks type imports, MCP churn JSON
serialization, old operation tests, and playback assertions that still expect
the pre-WARP files to exist.

## GREEN

- `src/warp/warp-structural-log.ts` owns `StructuralLogEntry` and
  `StructuralLogSymbolChange`.
- `src/warp/warp-structural-churn.ts` owns `ChurnEntry` and
  `StructuralChurnResult`.
- `src/mcp/tools/structural-churn.ts` serializes through the shared
  `toJsonObject` helper.
- Deleted legacy operation modules:
  - `src/operations/structural-log.ts`
  - `src/operations/structural-churn.ts`
- Deleted legacy operation tests:
  - `test/unit/operations/structural-log.test.ts`
  - `test/unit/operations/structural-churn.test.ts`
- `tests/playback/CORE_v070-structural-history.test.ts` now checks the
  WARP-backed files and asserts that the old operation modules are absent.

## Backlog Upkeep

The source card moved from `docs/method/backlog/bad-code/` into this design
record. No card was admitted to the graveyard because the task was relevant and
completed.
