# Machine-readable outputs carry versioned schemas

**Legend:** CORE
**Status:** Enforced

Every machine-readable MCP and CLI output must declare its schema with
a versioned `_schema` marker, and the declared contract must exist in
the shared output-schema registry.

This applies to:
- MCP tool responses
- MCP `tools/list` discovery contracts and successful `structuredContent`
- CLI `--json` responses
- shared machine-readable receipt structure

The strict versioned schema registry is the validation authority. MCP discovery
publishes a deterministic bounded projection of that authority because the
protocol requires an object-root output schema and agents should not pay to
receive the complete recursive audit grammar for every tool. The projection
must retain all top-level fields, exact `_schema` identity, scalar and
discriminant constraints, and compact/full receipt posture.

Successful MCP results carry both native `structuredContent` and canonical JSON
compatibility text. Parsing the text must produce exactly the structured value;
neither representation may be generated independently. Errors may remain
text-only with `isError: true`, as permitted by MCP.

## If violated

Agents and wrappers have to reverse-engineer output shapes from examples
or implementation details. Compatibility becomes accidental, and
breaking changes slip in without any explicit version boundary.

## How to verify

- `src/contracts/output-schemas.ts` declares every machine-readable
  surface and schema version
- `src/contracts/mcp-discovery-output-schemas.ts` derives bounded MCP discovery
  schemas from the strict registry
- MCP responses include `_schema`
- every registered MCP tool advertises an object-root `outputSchema`
- successful MCP responses provide equivalent text and `structuredContent`
- CLI commands with JSON output include `_schema`
- tests validate emitted payloads against the declared schemas
