---
title: "Symbol history output enrichment"
legend: "WARP"
cycle: "WARP_symbol-history-output-enrichment"
source_backlog: "follow-up from retired branch origin/cycle/WARP_symbol-history-timeline"
status: completed
---

# Symbol history output enrichment

## Hill

`graft_blame` and its CLI peer `graft symbol history` return the
per-version path and line range already present in WARP symbol timeline
facts, while preserving the existing `graft_blame` / `symbol_blame`
schema authority instead of adding a second `code_show(history: true)`
wire shape.

## Acceptance Criteria

- `graft_blame.history[]` entries include `path`.
- `graft_blame.history[]` entries include `startLine` and `endLine`
  when WARP has line-range facts for that version.
- Removed-symbol entries remain representable when line ranges are not
  available.
- `graft symbol history` renders the enriched location facts in its
  human timeline.
- The old `code_show(history: true)` branch can be deleted without
  losing useful product behavior.

## Playback Questions

### Human

- [x] Can I run `graft symbol history <symbol> --path <path>` and see
  where each timeline entry lived?
- [x] Can I tell that the history surface is still the canonical symbol
  history/blame surface, not a new `code_show` variant?

### Agent

- [x] Does MCP `graft_blame` expose per-version `path`, `startLine`,
  and `endLine` where available?
- [x] Does the CLI JSON peer keep the existing `graft.cli.symbol_blame`
  schema id?
- [x] Do removed entries keep `path` without requiring line metadata?

## Non-goals

- [ ] Do not add `code_show(history: true)` in this slice.
- [ ] Do not add `graft symbol show --history`.
- [ ] Do not change the canonical symbol identity model or claim
  cross-name rename continuity.
- [ ] Do not create a second wire format for symbol history.
