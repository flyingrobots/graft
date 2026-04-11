# MCP graft_map tool still couples collection and response assembly

File: `src/mcp/tools/map.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- typed request/result objects now exist, but the tool still owns file
  enumeration, policy checks, parsing, symbol projection, and summary
  assembly

Desired end state:
- move structural map collection into a dedicated collector seam and
  keep the tool focused on request/response translation

Effort: S
