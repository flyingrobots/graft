# MCP receipt shaping still relies on structural casting

File: `src/mcp/receipt.ts`

Non-green SSJR pillars:
- Behavior on type 🟡

What is wrong:
- receipt-bearing tool payloads are composed from structural objects and type assertions rather than explicit runtime result types

Desired end state:
- stronger runtime-backed receipt envelope model

Effort: S
