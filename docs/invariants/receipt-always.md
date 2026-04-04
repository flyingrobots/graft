# Every MCP response has a receipt

**Legend:** CORE

Every MCP tool response includes a `_receipt` block with:
- `sessionId` — stable session identifier
- `seq` — monotonically increasing sequence number
- `ts` — ISO 8601 timestamp
- `tool` — which tool was called
- `projection` — what policy decided (content/outline/refused/none)
- `reason` — machine-stable reason code
- `fileBytes` — original file size (null for non-file tools)
- `returnedBytes` — bytes in the response
- `cumulative` — running totals (reads, outlines, refusals,
  cacheHits, bytesReturned, bytesAvoided)

## If violated

Blacklight cannot analyze sessions. Burden measurement is
impossible. There is no way to prove graft is working.

## How to verify

- `buildReceiptResult` is called in the `respond` function that
  wraps every tool handler
- Receipt tests verify all fields are present and correctly typed
- Integration tests check receipts on real tool calls
