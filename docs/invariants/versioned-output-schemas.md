# Machine-readable outputs carry versioned schemas

**Legend:** CORE
**Status:** Enforced

Every machine-readable MCP and CLI output must declare its schema with
a versioned `_schema` marker, and the declared contract must exist in
the shared output-schema registry.

This applies to:
- MCP tool responses
- CLI `--json` responses
- shared machine-readable receipt structure

## If violated

Agents and wrappers have to reverse-engineer output shapes from examples
or implementation details. Compatibility becomes accidental, and
breaking changes slip in without any explicit version boundary.

## How to verify

- `src/contracts/output-schemas.ts` declares every machine-readable
  surface and schema version
- MCP responses include `_schema`
- CLI commands with JSON output include `_schema`
- tests validate emitted payloads against the declared schemas
