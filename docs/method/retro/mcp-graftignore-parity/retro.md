---
title: "Retro 0031 — MCP `.graftignore` Parity"
---

# Retro 0031 — MCP `.graftignore` Parity

**Status:** Met

## What shipped

Cycle 0031 closed the highest-value MCP policy bug from the 0030 audit.
MCP now loads `.graftignore` at server startup, evaluates repo-relative
paths for ignore matching, and passes the same session/budget context
through the bounded-read and precision paths that were previously
assembling partial option sets inline.

The concrete surfaces fixed in this cycle were:

- `safe_read`
- `file_outline`
- `read_range` middleware
- `changed_since`
- precision policy checks used by `code_show` / `code_find`

`code_find` also stopped silently returning an empty result when every
match was denied by policy. It now returns an explicit refusal, which is
closer to the operator contract captured in the policy parity invariant.

## What remains

Policy fidelity is still not fully closed across the repo.

Still open:

- structural multi-file tools (`graft_map`, `graft_diff`, `graft_since`)
- `run_capture` policy boundary
- broader cross-surface parity witnesses beyond this focused slice

## Evidence

- targeted witness: `npx vitest run test/unit/mcp/tools.test.ts test/unit/mcp/changed.test.ts test/unit/mcp/precision.test.ts`
- repo verification: `pnpm test`, `pnpm lint`, `pnpm typecheck`
