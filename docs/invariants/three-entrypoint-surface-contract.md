# Invariant: API, CLI, and MCP Surfaces Are Explicit

**Status:** Enforced
**Legend:** CORE

## What must remain true

Graft has three official product entry points:

- API
- CLI
- MCP

Those surfaces must be explicit in repo truth, not implied by accident.

For every product-facing capability:

- the intended entry point set must be declared explicitly
- API exposure must be named explicitly when it exists
- CLI/MCP peer posture must be explicit when both transport surfaces are
  involved
- any intentional one-surface-only capability must be documented as
  such, not discovered by surprise

API counts as a first-class surface. It is not a hidden side door, and
it is not exempt from architectural clarity just because it is an
in-process library.

## Why it matters

Without an explicit three-surface model, the repo drifts into a false
picture:

- CLI and MCP look official
- API looks accidental
- parity work only thinks in two surfaces
- release review misses capability drift that affects integrators

That would be the wrong product shape for Graft now that close
integration with external apps is a real use case.

The explicit surface contract keeps the project honest:

- API is treated as a real product surface
- CLI stays a truthful operator surface
- MCP stays a truthful agent transport surface
- capability decisions can be reviewed per surface before release

## How to check

- the capability registry names API / CLI / MCP surface availability
- API exposure kind is explicit for direct package surfaces
- CLI/MCP peer posture is explicit rather than inferred
- architecture docs name all three official entry points
- release and backlog review can identify missing baseline coverage
  across the intended surfaces
