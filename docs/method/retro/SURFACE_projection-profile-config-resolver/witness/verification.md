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

## GREEN

Focused resolver/root-export regression:

```text
$ pnpm vitest run test/unit/operations/projection-profile-resolver.test.ts test/unit/library/index.test.ts

Test Files  2 passed (2)
Tests       13 passed (13)
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

Test Files  242 passed (242)
Tests       1805 passed (1805)
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
- No TOML parser or filesystem discovery was added.
- No authority context was attached to `StructuredBuffer`.
- No Wesley provider was added.
- No Echo execution, Jim admission, settlement, or reintegration claim was
  added.
