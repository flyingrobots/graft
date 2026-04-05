# Unsafe args casts in tool handlers

All tool handlers cast `args["path"] as string`, `args["command"]
as string`, etc. without runtime validation. The Zod schemas
passed to `mcpServer.registerTool()` are used by the MCP SDK for
documentation/discovery but the SDK may not enforce them before
calling the handler.

If args are ever malformed (null, undefined, wrong type), the cast
silently passes garbage through. `resolvePath` might throw on
non-string input, but other fields (numbers, booleans) could
produce NaN or silent misrouting.

## Fix

Centralized args validation in the server's tool dispatch loop:
parse args through the tool's Zod schema before calling the handler.
Each handler then receives validated, typed args.

## Files

- `src/mcp/server.ts` — add `z.object(def.schema).parse(args)` in
  dispatch loop before calling handler
- Schema-backed tool handlers (8 of 10) — remove `as` casts,
  accept typed args from the parsed result
- `doctor` and `stats` have no schema — no args to validate

Effort: S

Flagged by CodeRabbit on PR #19. Pre-existing since cycle 0001.
