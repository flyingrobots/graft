---
title: "Honor session budget caps in graft_map"
legend: MCP
lane: inbox
---

# Honor session budget caps in graft_map

The `graft_map` MCP tool does not honor an exhausted session budget even though bounded read tools do. This creates a hard policy inconsistency inside the same session: `safe_read` falls back to `BUDGET_CAP` outline mode while `graft_map` still emits hundreds of kilobytes of structural data.

## Environment
- Repo under test: `/Users/james/git/git-stunts/git-warp`
- Graft repo receiving this report: `/Users/james/git/graft`
- Date observed: `2026-04-18`
- Worktree state during reproduction: clean `git status --short`
- Transport session id from receipts: `898c0ff7-f397-4641-9c26-854540c6c9dc`

## Reproduction
1. Use `graft_map(path:"src/domain/services")` on a large directory.
2. Call `set_budget(bytes: 20000)`.
3. Confirm budget receipt reports `remaining: 0`.
4. Call `safe_read(path:"src/domain/services/codec/AnchorMessageCodec.ts")`.
5. Call `graft_map(path:"src/domain/services")` again.

## Observed results
### Budget state
- `set_budget(bytes: 20000)` reported:
  - `consumed: 1021029`
  - `fraction: 51.051`
  - `remaining: 0`
  - `total: 20000`

### Control case proving budget enforcement exists elsewhere
- `safe_read(path:"src/domain/services/codec/AnchorMessageCodec.ts")`
  - target file size: `1508` bytes, `57` lines
  - receipt reason: `BUDGET_CAP`
  - projection downgraded to `outline`
  - tool did not return full file content

### Failing case
- `graft_map(path:"src/domain/services")` after budget exhaustion
  - receipt budget still shows `remaining: 0`
  - receipt `returnedBytes: 375721`
  - summary still reports `155 files, 2326 symbols`
  - the tool emitted another massive full structural payload despite exhausted budget

## Why this is a bug
The session budget is supposed to constrain context pressure. In the same exhausted-budget state:
- `safe_read` changes behavior and self-limits
- `graft_map` ignores the limit and returns a giant payload

That means the budget mechanism is not consistently enforced across tool families. An agent cannot rely on budget state to choose safe operations if one of the heaviest tools simply bypasses it.

## Expected behavior
When remaining budget is `0`, `graft_map` should not return a 375 KB directory map.

Acceptable outcomes:
- refuse with a budget-related reason code
- return a compact summary only
- cap the result to a small prefix of files/symbols
- require narrower path selection
- paginate the result and return only the first page

## Actual behavior
`graft_map` appears to run as a `search`/`nonRead` surface that is exempt from the same budget rules that govern bounded reads.

## Suspected root cause
Budget enforcement likely exists on read-oriented surfaces but not on high-volume structural search surfaces. `graft_map` probably needs explicit integration with the same budget governor, or its own hard output cap with a summarized fallback.

## Acceptance criteria
- `graft_map` respects exhausted and near-exhausted budget state.
- Receipts explain when output was capped, summarized, or paginated.
- The tool suggests a narrower next query when a full map would exceed safe budget.
- Re-running the reproduction above does not emit a 375 KB payload after `remaining: 0`.

## Evidence receipts
- `set_budget` seq `22`
- `safe_read` seq `24`
- `graft_map` seq `25`
- all observed within session `898c0ff7-f397-4641-9c26-854540c6c9dc`
