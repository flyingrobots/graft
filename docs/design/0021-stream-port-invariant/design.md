# Cycle 0021: Stream/Port Invariant

## Hill

The rule "Streams explore, Ports decide" is enforced at runtime,
not documented. Code that violates the invariant throws, not
compiles-but-misbehaves.

## Sponsor

WARP architecture. When streams land, this invariant prevents the
single most dangerous class of bugs: nondeterministic persistence.

## The Two-Case Rule

There are only two valid shapes of data access:

**Case 1: Bounded Artifact**
- Returns: `Promise<T>`
- Examples: `readPatch(oid)`, `readCommit(sha)`
- Must be fully materialized
- Must be valid or fail

**Case 2: Unbounded Traversal**
- Returns: `AsyncIterable<T>`
- Examples: `walkCommits(ref)`, `scanIndex()`
- May be infinite
- Must support backpressure

**Forbidden:**
- `AsyncIterable<Chunk>` from a port (streams don't decide)
- `Promise<Array<...>>` for large traversals (bounded lie)
- "Sometimes stream, sometimes value" (pick one)

## Deliverables

1. Runtime guard functions (`src/guards/`)
2. Invariant doc (`docs/invariants/`)
3. Existing ports retrofitted with guards
4. Tests proving guards catch violations

## Non-goals

- Building the actual WARP stream classes (separate cycle)
- Lint rules (COULD, not MUST — AST linting is a project)

Effort: S
