# Invariant: Releases Gate Three-Surface Capability Posture

**Status:** Enforced
**Legend:** CORE

## What must remain true

Before release, Graft must verify that these sources still agree:

- the capability registry in `src/contracts/capabilities.ts`
- `docs/three-surface-capability-matrix.md`
- `docs/public-api.md`

The release process must treat that agreement as a hard gate, not as a
nice-to-have documentation check.

## Why it matters

Graft now has three official entry points:

- API
- CLI
- MCP

If release review only thinks about CLI or MCP, API drift becomes
invisible until an integrator trips over it. If the matrix drifts away
from the registry, the docs stop being repo truth. If the public API
contract drifts away from the matrix, release posture becomes unclear.

The release gate keeps those surfaces tied together:

- registry truth stays mechanical
- docs stay honest
- API remains a first-class reviewed surface
- releases do not silently widen or narrow capability posture
- composed CLI operator/lifecycle commands cannot be hidden as MCP-only
  rows

## How to check

- run `pnpm release:surface-gate`
- verify the release runbook requires that step
- verify the capability matrix and public API docs still match the
  registry and package surface
- verify CLI operator/lifecycle rows are either explicitly represented as
  `composed_cli_operator` or documented as pure host/runtime launch
  commands outside capability-row scope
