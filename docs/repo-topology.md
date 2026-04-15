# Repo Topology

Graft has three official entry points:

- `src/api/` for the direct in-process library surface
- `src/cli/` for operator and debugging commands
- `src/mcp/` for MCP transport and daemon-serving surfaces

Those three directories are the visible primary adapters around one
application core. They should shape input and output for their surface,
but they should not become alternate homes for the same product
behavior.

## Top-Level Roles

### Package export root

- `src/index.ts`

This file is the package export root for `@flyingrobots/graft`. It is
not the API implementation home. Its job is to re-export the supported
API surface from `src/api/` and stay thin enough that the repo topology
remains obvious.

### Official primary adapters

- `src/api/`
- `src/cli/`
- `src/mcp/`

These are the three official product entry points. `src/api/` is the
API primary adapter home. They are peers in surface status even though
they expose different shapes:

- API returns direct typed values and objects.
- CLI shapes operator-facing text or JSON.
- MCP shapes machine-readable tool contracts and receipts.

### Adjunct entrypoints

- `src/hooks/`

Hooks remain real entrypoints into the system, but they are not one of the
three official product surfaces. Treat them as local automation and
governance adjuncts around the same application core.

### Application core

- `src/operations/`
- `src/policy/`
- `src/session/`
- `src/git/`
- `src/metrics/`
- `src/release/`

This is where shared product behavior should converge. When a
capability exists across API, CLI, and MCP, the behavior should live
here or in another core module below the primary adapters.

### Foundational contracts and pure helpers

- `src/contracts/`
- `src/ports/`
- `src/guards/`
- `src/format/`

These modules define contracts, schemas, and pure helpers that should
remain below the application and adapter layers.

### Secondary adapters and infrastructure bindings

- `src/adapters/`
- `src/parser/`
- `src/warp/`

These modules bind the core to platform or infrastructure details. They
should not absorb product flow that belongs in the application layer.

## Practical Rules

- If a new public library surface is added, its implementation belongs
  under `src/api/`, not directly in `src/index.ts`.
- If a capability is shared across entry points, extract the behavior
  downward into the application core instead of copying it into another
  primary adapter.
- If a module needs direct `node:*`, `@git-stunts/*`, parser, or WARP
  details, it probably belongs in a secondary adapter or behind a port.
- Lint guardrails must treat `src/api/` the same way they already treat
  `src/cli/` and `src/mcp/` as primary-adapter boundaries.
