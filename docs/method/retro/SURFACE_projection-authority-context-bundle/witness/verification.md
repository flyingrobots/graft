# Verification

## RED

Focused authority-context regression:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts

Test Files  1 failed (1)
Tests       4 failed | 18 passed (22)

Failures:
- expected `bundle.authority` to equal a resolved authority slot
- expected blank and explicit profile overrides to produce authority slots
- expected authority failure to be structured
- expected resolver absence to report `not_configured`
```

Self-review regression:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts

Test Files  1 failed (1)
Tests       1 failed | 22 passed (23)

Failure:
- expected a TypeScript buffer with resolver `no_provider` to keep full native
  structured parsing instead of `PROJECTION_AUTHORITY_UNAVAILABLE`
```

## GREEN

Focused structured-buffer regression:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts

Test Files  1 passed (1)
Tests       23 passed (23)
```

Focused structured-buffer/root-export regression:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  2 passed (2)
Tests       28 passed (28)
```

TypeScript:

```text
$ pnpm typecheck

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

Full suite:

```text
$ pnpm test

Test Files  243 passed (243)
Tests       1815 passed (1815)
```

Transient suite-pressure check:

```text
$ pnpm test

Test Files  1 failed | 242 passed (243)
Tests       1 failed | 1814 passed (1815)

Failure:
- `test/unit/mcp/daemon-worker-pool.test.ts` timed out in the full suite under
  worker pressure
```

Focused timeout rerun:

```text
$ pnpm vitest run test/unit/mcp/daemon-worker-pool.test.ts

Test Files  1 passed (1)
Tests       7 passed (7)
```

## Review Repair

Resolved-provider regression RED:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts

Test Files  1 failed (1)
Tests       1 failed | 23 passed (24)

Failure:
- expected a resolved Wesley authority without a registered provider to report
  `PROJECTION_PROVIDER_UNAVAILABLE`
```

Authority partial regression RED:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts

Test Files  1 failed (1)
Tests       1 failed | 24 passed (25)

Failure:
- expected an Edict `no_provider` authority failure to keep warm bundle
  `partial` metadata true
```

Test-quality cleanups:

```text
RED not applicable: assertion shape only.
```

Review repair GREEN:

```text
$ pnpm vitest run test/unit/library/structured-buffer.test.ts test/unit/library/index.test.ts

Test Files  2 passed (2)
Tests       30 passed (30)

$ pnpm typecheck
$ pnpm build
$ pnpm lint
$ pnpm release:surface-gate
$ pnpm vitest run test/unit/release/package-docs.test.ts
$ git diff --check
$ pnpm test

Test Files  243 passed (243)
Tests       1817 passed (1817)
```

## Scope Guard

- Projection bundles now expose an authority slot.
- Resolver failure skips provider invocation.
- Registry-routed providers receive resolved authority context.
- Blank profile overrides remain absence-shaped input.
- Explicit profile override wins over route/fallback resolution.
- Existing Edict projection behavior remains compatible.
- No TOML parser or filesystem discovery was added.
- No Wesley provider was added.
- No Wesley SDL, descriptor, Echo, Jim, or settlement semantics were
  interpreted by Graft.
