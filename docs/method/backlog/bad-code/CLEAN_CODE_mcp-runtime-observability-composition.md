# MCP runtime observability still couples config, event modeling, and log persistence

File: `src/mcp/runtime-observability.ts`

Non-green SSJR pillars:
- SOLID 🟡
- DRY 🟡

What is wrong:
- config parsing, event modeling, failure classification, and rotating
  NDJSON persistence all live in one module
- runtime log retention now duplicates the same bounded NDJSON rotation
  pattern already used by metrics logging

Desired end state:
- split runtime event/config shaping from persistence mechanics, or
  share one rotating NDJSON log writer across MCP and metrics logging

Effort: S
