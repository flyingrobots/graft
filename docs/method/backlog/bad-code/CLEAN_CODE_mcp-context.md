# MCP context is still a loose dependency bag

File: `src/mcp/context.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- tool context is still largely an interface-shaped bag of dependencies and functions
- tool handlers consume loose records instead of stronger runtime request/response types

Desired end state:
- stronger runtime-backed tool context and request models

Effort: M
