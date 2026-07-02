---
title: "Verification Witness for Cycle SURFACE_edict-projection-bridge"
---

# Verification Witness for Cycle SURFACE_edict-projection-bridge

This witness proves that `SURFACE: Edict projection bridge` carries the required
behavior and adheres to the repo invariants.

## RED

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts test/unit/adapters/edict-cli-projection-provider.test.ts test/unit/library/structured-buffer.test.ts

FAIL test/unit/adapters/edict-cli-projection-provider.test.ts
Error: Cannot find module '../../../src/adapters/edict-cli-projection-provider.js'

FAIL test/unit/operations/edict-projection.test.ts
Error: Cannot find module '../../../src/operations/edict-projection.js'

FAIL test/unit/library/structured-buffer.test.ts > recognizes Edict buffers and reports missing projection provider explicitly
AssertionError: expected null to be 'edict'

FAIL test/unit/library/structured-buffer.test.ts > projects Edict syntax and diagnostics through an injected Edict projector
AssertionError: expected null to be 'edict'
```

Self-review hardening also produced this targeted RED before the decoder was
tightened:

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts

FAIL test/unit/operations/edict-projection.test.ts > Edict projection decoding > rejects Edict JSONL records with the wrong command envelope
AssertionError: expected [Function] to throw an error
```

Post-review repair produced this targeted RED before fixing the projection
boundary:

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts test/unit/library/structured-buffer.test.ts

FAIL test/unit/operations/edict-projection.test.ts > Edict projection decoding > keeps blocked and failed projection slots explicit
EdictProjectionError: unknown Edict core state failed

FAIL test/unit/operations/edict-projection.test.ts > Edict projection decoding > rejects projection records for a different input name
AssertionError: expected [Function] to throw an error

FAIL test/unit/operations/edict-projection.test.ts > Edict projection decoding > fails closed when Edict omits a requested diagnostics record
AssertionError: expected [] to deeply equal [...]

FAIL test/unit/library/structured-buffer.test.ts > library: structured buffer > marks Edict snapshots partial when requested syntax projection fails
AssertionError: expected partial: false to equal partial: true
```

## GREEN

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts test/unit/adapters/edict-cli-projection-provider.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  4 passed (4)
Tests  22 passed (22)
```

Post-review repair focused GREEN:

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts test/unit/library/structured-buffer.test.ts

Test Files  2 passed (2)
Tests  18 passed (18)
```

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

```text
$ git diff --check

PASS
```

## Full Suite

```text
$ pnpm test

Test Files  240 passed (240)
Tests  1783 passed (1783)
```

## Scope Guard

- Graft now brokers Edict projection for dirty `.edict` buffers.
- Graft does not execute Echo.
- Graft does not admit bundles.
- Graft does not freeze Edict JSONL schemas; Edict remains the schema owner.
- Graft does not add a target plugin registry.
