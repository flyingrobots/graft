---
title: "Verification Witness for Cycle SURFACE_projection-provider-registry"
---

# Verification Witness for Cycle SURFACE_projection-provider-registry

This witness proves that `SURFACE: Projection provider registry` carries the
required behavior and adheres to the repo invariants.

## RED

Initial RED before the registry module, public exports, and buffer options
existed:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

FAIL test/unit/operations/projection-provider-registry.test.ts
Error: Cannot find module '../../../src/operations/projection-provider-registry.js'

FAIL test/unit/library/index.test.ts > public library API > exports direct, bridge, and host surfaces from the root package
AssertionError: expected 'undefined' to be 'function'

FAIL test/unit/library/structured-buffer.test.ts > library: structured buffer > projects Edict buffers through a projection provider registry
TypeError: createProjectionProviderRegistry is not a function

FAIL test/unit/library/structured-buffer.test.ts > library: structured buffer > routes synthetic dirty Edict buffers by explicit language id
TypeError: createProjectionProviderRegistry is not a function
```

Self-review hardening produced this targeted RED before registration became
failure-atomic:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts

FAIL test/unit/operations/projection-provider-registry.test.ts > projection provider registry > rejects registrations without extensions
AssertionError: expected function to throw an error, but it didn't

FAIL test/unit/operations/projection-provider-registry.test.ts > projection provider registry > does not retain partial registrations after validation failure
AssertionError: expected { language: 'edict', ... } to be null
```

## GREEN

Focused GREEN after implementation and self-review repair:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  3 passed (3)
Tests  26 passed (26)
```

Type and lint gates:

```text
$ pnpm typecheck

> @flyingrobots/graft@0.10.1 typecheck /Users/james/git/graft
> tsc --noEmit
```

```text
$ pnpm lint

> @flyingrobots/graft@0.10.1 lint /Users/james/git/graft
> eslint .
```

Public surface and build gates:

```text
$ pnpm release:surface-gate

Test Files  2 passed (2)
Tests  10 passed (10)
```

```text
$ pnpm build

> @flyingrobots/graft@0.10.1 build /Users/james/git/graft
> tsc -p tsconfig.build.json
```

Whitespace gate:

```text
$ git diff --check

PASS
```

## Full Suite

```text
$ pnpm test

Test Files  241 passed (241)
Tests  1793 passed (1793)
```

## Scope Guard

- Graft now exposes a projection provider registry for dirty-buffer projection.
- Registry routing supports Edict through the existing Edict provider contract.
- Direct `edictProjector` injection remains supported.
- Explicit `language: "edict"` routing supports synthetic dirty buffers.
- Graft does not implement Wesley SDL projection in this slice.
- Graft does not execute Echo.
- Graft does not admit bundles.
- Graft does not normalize all language payloads into an Edict-shaped model.
