---
title: "Verification Witness for Cycle SURFACE_profile-aware-wesley-sdl-provider"
---

# Verification Witness for Cycle SURFACE_profile-aware-wesley-sdl-provider

This witness proves that `SURFACE: Profile-aware Wesley SDL provider` carries
the required behavior and adheres to the repo invariants.

## RED

Initial RED before Wesley provider plumbing:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  1 failed | 2 passed (3)
Tests       3 failed | 38 passed (41)

Failures:
- expected Wesley syntax spans from the provider, but native GraphQL syntax was
  returned
- expected the wrong-profile fixture to invoke the Wesley provider with
  `wesley-base`, but the provider was not invoked
- expected a throwing Wesley provider to report
  `PROJECTION_PROVIDER_UNAVAILABLE`, but native GraphQL parsing reported full
```

Self-review RED before provider status errors marked projections partial:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts --testNamePattern "marks Wesley snapshots partial when provider status reports errors"

Test Files  1 failed (1)
Tests       1 failed | 28 skipped (29)

Failure:
- expected `buffer.partial` to be true when a Wesley provider returned
  `status: "error"` and `errors: 1`
```

## GREEN

Self-review regression GREEN:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts --testNamePattern "marks Wesley snapshots partial when provider status reports errors"

Test Files  1 passed (1)
Tests       1 passed | 28 skipped (29)
```

Focused provider and public API GREEN:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  3 passed (3)
Tests       42 passed (42)
```

TypeScript:

```text
$ pnpm typecheck

PASS
```

Lint:

```text
$ pnpm lint

PASS
```

Build:

```text
$ pnpm build

PASS
```

Release surface gate:

```text
$ pnpm release:surface-gate

Test Files  2 passed (2)
Tests       10 passed (10)
```

Whitespace:

```text
$ git diff --check

PASS
```

Full isolated suite:

```text
$ pnpm test

Test Files  243 passed (243)
Tests       1822 passed (1822)
```

## Scope Guard

- Graft can route `.graphql` and `.graphqls` dirty buffers to a Wesley provider
  through the projection registry.
- Graft passes the resolved authority context to Wesley.
- Graft preserves Wesley syntax, diagnostics, digests, and payload lanes.
- Graft fails closed when resolved Wesley authority is paired with a mismatched
  registry provider kind.
- The Wesley projection contract does not import the Edict projection contract.
- Graft does not parse `graft.projections.toml`.
- Graft does not ship a real Wesley process, CLI, LSP, LSM, or WASM adapter.
- Graft does not interpret Wesley directives or descriptor semantics.
- Graft does not execute Echo, admit Jim artifacts, settle consequences, or
  claim reintegration authority.

## Code Lawyer Repair

Provider-kind mismatch RED:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts --testNamePattern "fails closed when Wesley authority resolves to a mismatched registry provider kind"

Test Files  1 failed (1)
Tests       1 failed | 29 skipped (30)

Failure:
- expected the mismatched Edict provider not to be invoked under Wesley
  authority
```

Provider-kind mismatch GREEN:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts --testNamePattern "fails closed when Wesley authority resolves to a mismatched registry provider kind"

Test Files  1 passed (1)
Tests       1 passed | 29 skipped (30)
```

Provider-contract independence RED:

```text
$ pnpm vitest run test/unit/operations/wesley-projection.test.ts

Test Files  1 failed (1)
Tests       1 failed (1)

Failure:
- expected `src/operations/wesley-projection.ts` not to import
  `./edict-projection.js`
```

Provider-contract independence GREEN:

```text
$ pnpm vitest run test/unit/operations/wesley-projection.test.ts

Test Files  1 passed (1)
Tests       1 passed (1)
```

Focused repair suite:

```text
$ pnpm vitest run test/unit/operations/projection-provider-registry.test.ts test/unit/operations/wesley-projection.test.ts test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  4 passed (4)
Tests       44 passed (44)
```

TypeScript:

```text
$ pnpm typecheck

PASS
```
