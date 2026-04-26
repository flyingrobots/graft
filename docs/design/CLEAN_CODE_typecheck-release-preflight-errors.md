---
title: "Release preflight typecheck repair"
legend: "CLEAN_CODE"
cycle: "CLEAN_CODE_typecheck-release-preflight-errors"
source_backlog: "docs/method/backlog/bad-code/typecheck-release-preflight-errors.md"
---

# Release preflight typecheck repair

Source backlog item:
`docs/method/backlog/bad-code/typecheck-release-preflight-errors.md`
Legend: CLEAN_CODE

## Hill

`pnpm typecheck` passes on the v0.7.0 release branch without relaxing
TypeScript strictness, suppressing errors, or removing the release
preflight typecheck gate.

## Playback Questions

### Human

- [x] Does `pnpm typecheck` pass from the release branch?
- [x] Does the repair keep the release preflight gate intact?
- [x] Are schema and DTO fixes aligned with existing runtime behavior
      rather than hidden behind type casts?

### Agent

- [x] Are every registered MCP tool's output body schemas present in
      `src/contracts/output-schema-mcp.ts`?
- [x] Are exact optional property fixes represented by omitted fields,
      not explicit `undefined` values?
- [x] Do tests construct parser value objects instead of structurally
      forging branded `OutlineEntry` instances?

## Non-goals

- [x] Changing release scope or tagging v0.7.0.
- [x] Relaxing `tsconfig.json`.
- [x] Broadly refactoring old Git-backed structural operation modules.

## Backlog Context

`CORE_agent-worktree-hygiene` added a release preflight guard and then
surfaced that `pnpm typecheck` was already failing. The failures were
strictness drift:

- registered MCP tools missing from the MCP output body schema map
- monitor nudge failure responses missing common action fields
- exact-optional-property violations from explicit `undefined`
- WARP structural DTOs using stale field names
- tests constructing stale parser fixture shapes

The release branch cannot pass `pnpm release:check` until this is fixed.
