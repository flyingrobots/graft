# Cycle 0016: Value Objects

## Hill

Parser and session types are frozen value objects with constructor
validation. No plain-object literal can masquerade as an
OutlineEntry, JumpEntry, DiffEntry, OutlineDiff, or Tripwire.

## Sponsor

Systems-Style JavaScript P1 (runtime truth over type assertions).
Policy types already follow this pattern — parser and session types
should match.

## Context

`ContentResult`, `OutlineResult`, and `RefusedResult` in
`src/policy/types.ts` are the reference implementation: classes
with constructors that validate, copy, and `Object.freeze`.

The parser and session types are still plain interfaces constructed
with object literals. This means:
- No runtime identity (can't `instanceof` check)
- No constructor validation (invalid data compiles fine)
- Mutable after creation (nothing prevents mutation)
- No freeze guarantees (children arrays, nested objects)

## Targets

| Type | File | Construction sites |
|------|------|--------------------|
| `OutlineEntry` | `src/parser/types.ts` | `outline.ts` (~8 inline literals) |
| `JumpEntry` | `src/parser/types.ts` | `outline.ts` via `buildJumpEntry()` |
| `OutlineDiff` | `src/parser/diff.ts` | `diff.ts` (2 sites: `emptyDiff`, return) |
| `DiffEntry` | `src/parser/diff.ts` | `diff.ts` (4 inline literals) |
| `Tripwire` | `src/session/types.ts` | `tracker.ts` (4 inline literals) |

## Design

### Pattern (matches existing policy types)

```typescript
export class OutlineEntry {
  readonly kind: "function" | "class" | "method" | "interface" | "type" | "enum" | "export";
  readonly name: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly children?: readonly OutlineEntry[];

  constructor(opts: { kind: ...; name: string; ... }) {
    // assign, freeze children if present, Object.freeze(this)
  }
}
```

### Constructor validation

- **OutlineEntry**: `name` must be non-empty string
- **JumpEntry**: `start` must be >= 1, `end` must be >= `start`
- **DiffEntry**: `name` must be non-empty string
- **OutlineDiff**: no validation needed (arrays can be empty)
- **Tripwire**: `signal` and `recommendation` must be non-empty

### Freeze depth

- `OutlineEntry.children` — freeze the array and each child
  (children are already OutlineEntry instances, frozen by their
  own constructor)
- `OutlineDiff.added/removed/changed` — freeze each array
- `DiffEntry.childDiff` — already frozen by OutlineDiff constructor
- All other fields are primitives or already-frozen objects

### What does NOT change

- `OutlineResult` (parser) stays an interface — it's a container,
  not a domain value. It holds `OutlineEntry[]` and `JumpEntry[]`.
- `SessionDepth` stays a string union — it's an enum, not an object.
- `MetricsSnapshot`, `ReceiptDeps`, `CacheResult` — out of scope.

## Playback questions

1. Can every construction site migrate without changing behavior?
2. Do frozen children cause issues in outline extraction (which
   builds children arrays incrementally)?
3. Do any tests rely on mutating these objects after creation?
4. Does `Object.freeze` cause performance issues in the parser
   hot path?

## Scope

- 5 types converted to frozen classes
- All construction sites updated
- All existing tests pass without behavioral changes
- New unit tests for constructor validation and freeze guarantees

Effort: S
