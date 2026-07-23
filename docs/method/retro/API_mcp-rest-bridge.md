# Retro: API_mcp-rest-bridge

## Cycle Details
- Branch: `rest-api-mcp`
- Design: `docs/design/API_mcp-rest-bridge.md`

## What happened
- The design packet was created and followed.
- The `startRestServer` function was implemented in `src/mcp/rest-server.ts`. It correctly initializes a `node:http` server to expose the MCP tools over HTTP.
- Reusing `createGraftServer` allowed leveraging the exact same validation and execution semantics as the standard MCP transport.
- The test suite verified `GET /tools` and `POST /tools/:name`.
- An initial issue was observed where `stats` timed out because `createGraftServer()` with the real project root spins up background indexing. Using `createIsolatedServer()` and a simple tool like `capabilities` resulted in fast and reliable tests.
- We exported `startRestServer` and its config type from `src/api/index.ts`.

## Validation Evidence
- `pnpm test:local test/unit/mcp/rest-server.test.ts` passes 100%.

## Follow-on Debt
- Currently, the server accepts `mode` but relies heavily on `GraftServer`'s initialized state. If this capability is moved out of experimental, we'll want to add `docs/API.md` references.
