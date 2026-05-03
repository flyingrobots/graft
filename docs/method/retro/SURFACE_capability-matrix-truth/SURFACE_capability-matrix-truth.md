---
title: "Capability matrix truth for CLI operator commands"
cycle: "SURFACE_capability-matrix-truth"
design_doc: "docs/design/SURFACE_capability-matrix-truth.md"
outcome: hill-met
drift_check: yes
---

# Capability matrix truth for CLI operator commands Retro

## Summary

Capability registry and matrix now distinguish direct CLI/MCP peers, composed CLI operator surfaces, and intentionally API+MCP-only agent/control-plane tools. `daemon_status` is represented as a composed CLI operator surface for `graft daemon status` without adding a direct CLI peer or new runtime behavior. Release and playback tests guard against hiding composed CLI operator commands as MCP-only rows.

## Playback Witness

Artifacts under `docs/method/retro/SURFACE_capability-matrix-truth/witness`.

## Validation

- Targeted capability truth tests passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm release:surface-gate` passed.
- `pnpm test:local` passed: 199 files, 1502 tests.
- `pnpm test` stopped at Docker availability preflight because the Docker
  daemon is unavailable on this machine.
- `method drift SURFACE_capability-matrix-truth` passed.

Targeted command:

```sh
pnpm exec vitest run --run \
  tests/playback/SURFACE_capability-matrix-truth.test.ts \
  test/unit/contracts/capabilities.test.ts \
  test/unit/release/three-surface-capability-posture.test.ts \
  tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts
```

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
