---
title: "Bound large graft_map directory payloads for agent-safe transport"
legend: MCP
lane: inbox
---

# Bound large graft_map directory payloads for agent-safe transport

Large `graft_map` responses are operationally unsafe even before any explicit budget cap is applied. On medium-to-large directories the tool returns hundreds of kilobytes of JSON-like structural data in one response. That is large enough to dominate agent context, trigger UI or transport truncation, and make the tool impractical as an exploration primitive.

## Environment
- Repo under test: `/Users/james/git/git-stunts/git-warp`
- Date observed: `2026-04-18`
- Transport session id from receipts: `898c0ff7-f397-4641-9c26-854540c6c9dc`

## Reproduction
1. Run `graft_map(path:"src/domain")` in the `git-warp` repo.
2. Run `graft_map(path:"src/domain/services")`.
3. Compare those payload sizes with smaller-directory control calls like `graft_map(path:"src/domain/capabilities")` or `graft_map(path:"src/domain/artifacts")`.

## Observed results
### Large directory payloads
- `graft_map(path:"src/domain")`
  - receipt `returnedBytes: 567568`
  - summary `348 files, 3709 symbols`
- `graft_map(path:"src/domain/services")`
  - receipt `returnedBytes: 375643`
  - summary `155 files, 2326 symbols`

### Smaller control cases
- `graft_map(path:"src/domain/capabilities")`
  - receipt `returnedBytes: 6200`
  - summary `17 files, 44 symbols`
- `graft_map(path:"src/domain/artifacts")`
  - receipt `returnedBytes: 5365`
  - summary `12 files, 26 symbols`
- `graft_map(path:"src/domain/warp")`
  - receipt `returnedBytes: 13380`
  - summary `7 files, 108 symbols`

## Why this is a bug
`graft_map` is supposed to be a practical structural map of a directory. At current output sizes on large trees, it stops behaving like a map and starts behaving like an uncontrolled dump. That breaks the tool at the interaction level even if the structural data itself is correct.

Concrete harms:
- the response can crowd out all other useful session context
- downstream UIs and transports may truncate the payload
- agents cannot safely use the tool on large roots without risking context collapse
- the tool encourages broad queries but punishes them with unusably large responses

## Expected behavior
The tool should keep large directory queries agent-safe.

Possible designs:
- summary-first response with per-file counts and explicit continuation
- capped result set with deterministic ordering
- pagination / cursor-based browsing
- file-count or byte-count ceiling that switches to directory-level aggregation
- optional verbosity levels such as `summary`, `normal`, `full`

## Actual behavior
The tool returns the entire structural payload for large directories in one shot.

## Additional note
This report is distinct from the budget-enforcement bug. Even with no explicit `set_budget` call, `graft_map` is still too eager on large directories. Budget handling should fix one class of failure, but the default uncapped behavior still needs its own guardrails.

## Acceptance criteria
- A large directory map no longer returns 300-500+ KB in a single default response.
- Default behavior remains useful on small directories.
- Large responses become paginated, summarized, or capped with an explicit continuation mechanism.
- Receipts make truncation/summarization visible.

## Evidence receipts
- `graft_map(path:"src/domain")` seq `5`
- `graft_map(path:"src/domain/services")` seq `20`
- `graft_map(path:"src/domain/capabilities")` seq `16`
- `graft_map(path:"src/domain/artifacts")` seq `21`
- `graft_map(path:"src/domain/warp")` seq `19`
- all observed within session `898c0ff7-f397-4641-9c26-854540c6c9dc`
