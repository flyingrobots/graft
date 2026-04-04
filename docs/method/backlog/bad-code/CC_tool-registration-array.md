# Hardcoded tool registration array in server.ts

SSJS P4 (SOLID/OCP) violation. Adding a new MCP tool requires
modifying the `toolDefs` array in `createGraftServer()`. The
server is not open for extension — every new tool touches the
god function.

## File

- `src/mcp/server.ts` lines 60–70

## Fix

Extract a tool registry pattern: each tool handler file exports
a registration descriptor (name, schema, description, handler
factory). The server discovers and registers them automatically.
Could be a simple `toolDefs` array built from imports, or a
registry class with `.register()`.

Effort: S
