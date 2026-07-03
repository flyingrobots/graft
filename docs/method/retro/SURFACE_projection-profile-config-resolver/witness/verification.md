---
title: "Verification Witness for Cycle SURFACE_projection-profile-config-resolver"
---

# Verification Witness for Cycle SURFACE_projection-profile-config-resolver

This witness records validation for the projection profile config resolver
slice.

## Scope

Changed files:

- `CHANGELOG.md`
- `docs/design/SURFACE_projection-profile-config-resolver.md`
- `docs/public-api.md`
- `src/api/index.ts`
- `src/contracts/review-digest.ts`
- `src/operations/projection-profile-resolver.ts`
- `src/operations/structured-buffer.ts`
- `test/unit/contracts/review-digest.test.ts`
- `test/unit/library/index.test.ts`
- `test/unit/operations/projection-profile-resolver.test.ts`
- `docs/method/retro/SURFACE_projection-profile-config-resolver/SURFACE_projection-profile-config-resolver.md`
- `docs/method/retro/SURFACE_projection-profile-config-resolver/witness/verification.md`

## RED

Focused resolver/root-export test before implementation:

```text
$ pnpm vitest run test/unit/operations/projection-profile-resolver.test.ts test/unit/library/index.test.ts

FAIL test/unit/operations/projection-profile-resolver.test.ts
Error: Cannot find module '../../../src/operations/projection-profile-resolver.js'

FAIL test/unit/library/index.test.ts
Expected root export createProjectionProfileResolver to exist.
```

Review repair regressions:

```text
$ pnpm vitest run test/unit/contracts/review-digest.test.ts test/unit/operations/projection-profile-resolver.test.ts

FAIL test/unit/contracts/review-digest.test.ts
expected function to throw an error, but it didn't

FAIL test/unit/operations/projection-profile-resolver.test.ts
expected function to throw an error, but it didn't
```

Second review repair regressions:

```text
$ pnpm vitest run test/unit/operations/projection-profile-resolver.test.ts

FAIL test/unit/operations/projection-profile-resolver.test.ts
expected function to throw an error, but it didn't

FAIL test/unit/operations/projection-profile-resolver.test.ts
expected error to be instance of ProjectionProfileResolverError

FAIL test/unit/operations/projection-profile-resolver.test.ts
expected profile digests for reordered extension inputs to match
```

## GREEN

Focused resolver/root-export regression:

```text
$ pnpm vitest run test/unit/operations/projection-profile-resolver.test.ts test/unit/library/index.test.ts

Test Files  2 passed (2)
Tests       13 passed (13)
```

Review repair regressions:

```text
$ pnpm vitest run test/unit/contracts/review-digest.test.ts test/unit/operations/projection-profile-resolver.test.ts test/unit/library/index.test.ts

Test Files  3 passed (3)
Tests       17 passed (17)
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

Release surface gate:

```text
$ pnpm release:surface-gate

Test Files  2 passed (2)
Tests       10 passed (10)
```

Build:

```text
$ pnpm build

PASS
```

Whitespace:

```text
$ git diff --check

PASS
```

Full isolated test suite:

```text
$ pnpm test

Test Files  243 passed (243)
Tests       1809 passed (1809)
```

## Scope Guard

- Graft now has a pure in-memory projection profile resolver.
- The root package exports the resolver factory, error class, and public types.
- `profileDigest` and `routingDigest` are split.
- The resolver treats blank profile overrides as absent.
- Unknown nonblank profiles return `unknown_profile`.
- Ambiguous route matches return `ambiguous_profile`.
- No matching route or fallback returns `no_provider`.
- Route-only changes move only `routingDigest`.
- Profile semantic changes move `profileDigest`.
- Digest output is tested against canonical JSON plus SHA-256 oracle behavior.
- Digest input rejects lossy non-JSON preimages before hashing.
- Profile option keys named `__proto__` are preserved as JSON data.
- Sparse option arrays are rejected by resolver config validation.
- Route config rejects negated glob patterns.
- Extension fallback config rejects malformed file suffixes.
- Extension fallback language must match the referenced profile language.
- Semantic extension declaration order does not move `profileDigest`.
- No TOML parser or filesystem discovery was added.
- No authority context was attached to `StructuredBuffer`.
- No Wesley provider was added.
- No Echo execution, Jim admission, settlement, or reintegration claim was
  added.
