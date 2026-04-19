# Invariant: Public API Uses the Root Import Only

**Status:** Enforced
**Legend:** CORE

## What must remain true

The only semver-public JavaScript module path for Graft is:

- `@flyingrobots/graft`

Deep imports into `src/**`, `dist/**`, or other implementation paths are
not public contract.

The documented root export families in [Public API Contract](../public-api.md)
are the public package API. Those exports may evolve while Graft remains
pre-1.0, but release review must still classify changes to them as
externally meaningful.

## Why it matters

Without one explicit root-import rule, the project drifts into a weak
posture:

- integrators guess which paths are safe to import
- internal file moves become accidental breaking changes
- release review misses real API breakage
- API posture falls behind CLI/MCP posture even though it is now a
  first-class surface

The root-import rule keeps the public contract finite and reviewable.

## How to check

- `package.json` exposes the root import and `./package.json`, not a
  growing set of implementation subpaths
- `docs/public-api.md` defines the public export families and names deep
  imports as non-public
- README points at the public API contract
- release doctrine classifies public API changes explicitly
