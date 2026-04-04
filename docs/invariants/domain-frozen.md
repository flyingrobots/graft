# Domain types are frozen after construction

**Legend:** CLEAN_CODE

Domain value types (`PolicyResult` variants, `HookInput`,
`HookOutput`, and eventually `OutlineEntry`, `JumpEntry`,
`DiffEntry`, `OutlineDiff`, `Tripwire`) are `Object.freeze`d
in their constructors. Nested objects and arrays are also frozen.

## If violated

Mutation-at-a-distance bugs. Cache entries corrupted by later
code. Policy results altered after evaluation. Shared references
silently modified.

## How to verify

- Each domain class has `Object.freeze(this)` in its constructor
- Tests assert `Object.isFrozen(instance)` and
  `Object.isFrozen(instance.nestedField)` for each type
- `instanceof` checks work (they're classes, not interfaces)
