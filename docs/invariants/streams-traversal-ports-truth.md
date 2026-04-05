# Invariant: Streams Are Traversal, Ports Are Truth

**Status:** Enforced (runtime guards)
**Guards:** `src/guards/stream-boundary.ts`
**Tests:** `test/unit/guards/stream-boundary.test.ts`

## The Law

Traversal may vary. Truth must not.

## The Two-Case Rule

There are exactly two valid shapes of data access in this system:

### Case 1: Bounded Artifact (Ports)

- **Returns:** `Promise<T>`
- **Examples:** `readPatch(oid)`, `readCommit(sha)`, `readFile(path)`
- Fully materialized before return
- Valid or throws — no partial results
- Deterministic: same input → same output

### Case 2: Unbounded Traversal (Streams)

- **Returns:** `AsyncIterable<T>`
- **Examples:** `walkCommits(ref)`, `scanIndex()`, `yieldShards()`
- May be infinite
- Must support backpressure (async iterator protocol)
- Order is NOT guaranteed until a sink restores it

### Forbidden

| Pattern | Why |
|---------|-----|
| Port returns `AsyncIterable` | Streams don't decide. Persistence boundaries need bounded values. |
| `Promise<Array<T>>` for large traversals | Bounded lie. Buffers the universe. |
| "Sometimes stream, sometimes value" | Pick one. The caller must know the shape at the call site. |
| Streaming writes to persistence | Nondeterministic. Buffer, canonicalize, then write. |

## Enforcement

### Runtime guards (`src/guards/stream-boundary.ts`)

- `assertNotStream(value, context)` — throws TypeError if value is
  AsyncIterable. Use at port return boundaries.
- `assertStream(value, context)` — throws TypeError if value is NOT
  AsyncIterable. Use at stream transform entry points.
- `guardPortReturn(portName, methodName, fn)` — wraps a port method
  to automatically guard its return value.
- `isAsyncIterable(value)` — type-narrowing predicate.

### Where guards are applied

- Every port return boundary (FileSystem, JsonCodec, and future
  WARP ports)
- Every stream transform entry point (when WARP streams land)
- Every sink finalization (buffer → canonicalize → write)

### Code review questions

Reviewers MUST ask on every PR that touches ports or streams:

1. "Why is this a stream?" (if it's a new AsyncIterable)
2. "Where is ordering restored?" (if data flows through transforms)
3. "Is this artifact bounded?" (if it's returned from a port)
4. "What happens on replay?" (if it touches persistence)

If those questions aren't answered, it doesn't merge.

## Why this matters

| Property | How this invariant enables it |
|----------|------------------------------|
| Deterministic replay | Same inputs → same outputs → same Git state |
| Debuggability | Inspect artifacts, not opaque chunks |
| Memory safety | Never accidentally buffer the universe |
| Composability | Streams scale, ports anchor |
| CRDT correctness | Ordering is explicit, not emergent |

## Sink discipline

Every persistence boundary MUST:

1. **Buffer** — collect all items from the stream
2. **Canonicalize** — sort/order deterministically
3. **Write** — persist the ordered result

No direct streaming writes. Ever. If someone "optimizes" this
away, they are breaking deterministic replay.
