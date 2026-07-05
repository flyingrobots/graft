# Verification

## RED

Focused receipt decoder regression:

```text
$ pnpm vitest run \
    test/unit/operations/edict-projection.test.ts \
    -t "preserves opaque Echo obstruction receipt projection records"

Test Files  1 failed (1)
Tests       1 failed | 7 skipped (8)

Failure:
- EdictProjectionError: unknown Edict JSONL schema edict.projection.echo-receipt/v1
```

## GREEN

Focused decoder and StructuredBuffer regression:

```text
$ pnpm vitest run test/unit/operations/edict-projection.test.ts test/unit/library/structured-buffer.test.ts

Test Files  2 passed (2)
Tests       43 passed (43)
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

Full suite:

```text
$ pnpm test

Test Files  244 passed (244)
Tests       1834 passed (1834)
```

## Scope Guard

- Graft now preserves an explicit Edict/Echo receipt projection slot.
- Graft rejects top-level receipt digests until canonical Echo receipt bytes
  exist.
- StructuredBuffer does not request receipts from the default Edict CLI bridge.
- Graft does not execute Echo.
- Graft does not admit Jim artifacts.
- Graft does not interpret obstruction reasons, hard rejection semantics,
  scheduler counterfactuals, settlement, or reintegration authority.
