# Legend: CLEAN_CODE (CC)

Structural quality work. Migrating the codebase from its initial
"make it work" state to the Systems-Style JavaScript standard.

## What it covers

- Runtime-backed domain types replacing plain objects and interfaces
- Hexagonal architecture (portable core, host adapters)
- Boundary validation (parse, don't cast)
- Runtime dispatch replacing tag switching
- Value object immutability (Object.freeze)
- Domain error classes

## What success looks like

Core graft logic (policy, parser, diff) runs in a browser without
modification. Domain concepts are classes with invariants. MCP
handlers parse arguments through schemas into domain types. No
`Record<string, unknown>` casting. No string-tag switching on
projection types.

## How you know

- Zero `as Record<string, unknown>` casts in source code
- Zero `projection === "string"` comparisons (replaced by instanceof)
- Core imports zero `node:*` modules
- Domain types have constructor tests
