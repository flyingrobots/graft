# Shape soup: plain objects instead of runtime-backed domain types

The codebase uses TypeScript interfaces and plain objects for core
domain concepts that should be classes with constructors, invariants,
and behavior. This violates P1 (Domain Concepts Require Runtime-Backed
Forms) of the Systems-Style JavaScript standard.

## Current violations

**Policy results** — `PolicyResult` is a TypeScript interface. The
`evaluatePolicy` function returns a plain object. Should be a class
hierarchy: `ContentResult`, `OutlineResult`, `RefusedResult`, etc.
with `instanceof` dispatch replacing string-tag switching on
`projection`.

**Outline entries** — `OutlineEntry`, `JumpEntry`, `OutlineResult`
are interfaces. Parser returns plain objects. Should be classes.

**Diff entries** — `DiffEntry`, `OutlineDiff` are interfaces.

**Observations** — `Observation` is an interface internal to the
MCP server. Should be a class with `isStale(content)` method
instead of external hash comparison.

**Receipts** — built as `Record<string, unknown>` and mutated in
place. Should be a frozen value object.

**MCP tool args** — arguments are cast from `Record<string, unknown>`
with `as`. They should be parsed through zod into domain types.

## Migration path

This is a legend-level refactor, not a single cycle. Suggested
sequence:

1. Policy result classes (most impactful — eliminates projection
   string switching throughout the codebase)
2. Outline/diff value objects
3. Observation class with behavior
4. Receipt value object
5. MCP boundary parsing

Each step is a debt cycle. Tests exist and will catch regressions.

Affects: every source file in `src/`
