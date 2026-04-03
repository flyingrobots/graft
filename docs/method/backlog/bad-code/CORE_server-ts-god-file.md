# server.ts is becoming a god file

`src/mcp/server.ts` is ~420 lines and growing. It handles: tool
registration, observation cache, receipt generation, session
tracking plumbing, and every tool handler inline. Each new tool
adds ~15 lines to the same file.

Fix: extract tool handlers into `src/mcp/tools/*.ts` (one per
tool or grouped by concern). server.ts becomes registration +
plumbing only.

Affects: `src/mcp/server.ts`
