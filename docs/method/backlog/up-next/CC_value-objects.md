# Value objects — freeze outline/diff/jump entries

Convert parser output types from plain interfaces to frozen
classes with constructors.

- `OutlineEntry` — class, Object.freeze in constructor
- `JumpEntry` — class, frozen
- `DiffEntry` — class, frozen
- `OutlineDiff` — class, frozen
- `Tripwire` — class, frozen

Constructor validates invariants (e.g., start <= end for jump
entries, non-empty name).

## Done criteria

- [ ] All listed types are classes with constructors
- [ ] All instances are frozen after construction
- [ ] All existing tests pass

See: audit Phase 4. Effort: S
