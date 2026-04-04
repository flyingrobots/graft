# Cycle 0016: Value Objects

## Hill

Parser and session types are frozen value objects with constructor
validation. No plain-object literal can masquerade as an
OutlineEntry, JumpEntry, DiffEntry, OutlineDiff, or Tripwire.

## Sponsor

Systems-Style JavaScript P1 (runtime truth over type assertions).
Policy types already follow this pattern — parser and session types
should match. Invariant: `domain-frozen`.

## Targets

| Type | File | Construction sites |
|------|------|--------------------|
| `OutlineEntry` | `src/parser/types.ts` | `outline.ts` (6 construction sites) |
| `JumpEntry` | `src/parser/types.ts` | `outline.ts` via `buildJumpEntry()` |
| `OutlineDiff` | `src/parser/diff.ts` | `diff.ts` (2 sites: `emptyDiff`, return) |
| `DiffEntry` | `src/parser/diff.ts` | `diff.ts` (4 inline literals) |
| `Tripwire` | `src/session/types.ts` | `tracker.ts` (4 inline literals) |

## Design

### Pattern (matches existing policy types)

```typescript
export class OutlineEntry {
  readonly kind: ...;
  readonly name: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly children?: readonly OutlineEntry[];

  constructor(opts: { ... }) {
    // validate, assign, freeze children, Object.freeze(this)
  }
}
```

### Constructor validation

- **OutlineEntry**: `name` must be non-empty
- **JumpEntry**: `start >= 1`, `end >= start`
- **DiffEntry**: `name` must be non-empty
- **OutlineDiff**: no validation (arrays can be empty)
- **Tripwire**: `signal` and `recommendation` must be non-empty

### Freeze depth

- `OutlineEntry.children` — freeze the array (children are already
  frozen by their own constructors)
- `OutlineDiff.added/removed/changed` — freeze each array
- All other fields are primitives or already-frozen objects

### What does NOT change

- `OutlineResult` (parser) stays an interface — container, not value
- `SessionDepth` stays a string union — enum, not object

Effort: S
