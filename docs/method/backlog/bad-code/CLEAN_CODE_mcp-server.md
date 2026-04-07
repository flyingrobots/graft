# MCP server is carrying too much orchestration weight

File: `src/mcp/server.ts`

Non-green SSJR pillars:
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- server construction, dependency wiring, policy middleware, schema registration, WARP lazy init, and transport-facing invocation all live together
- parsed tool args still collapse into loose records quickly

Desired end state:
- narrower server composition root
- tool invocation path that preserves stronger typed requests deeper into the call chain

Effort: M
