# Retro: CORE_structural-session-replay

## What shipped

`parseReceiptsForReplay(ndjson, sessionId)` extracts tool calls from
NDJSON receipts. `renderReplayMarkdown(entries)` produces a Markdown
table.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| graft replay command | ❌ No CLI command — just parse/render functions |
| Shows tool calls in order with targets | ✅ |
| Markdown render format | ✅ |
| Absence visible (test file never read) | ❌ No absence detection |
| Works for any completed session | ✅ Reads NDJSON |

## Gaps

1. **No CLI command**: Just library functions.
2. **No absence detection**: Doesn't flag directories/files never visited.

## Drift check

- Pure functions, no architecture concerns ✅
