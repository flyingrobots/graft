# Cycle 0005 — Changed Since Last Read

**Type:** Feature
**Legend:** WARP
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

When an agent re-reads a file that HAS changed, graft tells it
exactly what changed structurally — not the full content again, not
a line diff, but "function X gained a parameter, class Y added a
method, constant Z was removed." The agent gets the delta, not the
whole thing.

## Relationship to re-read suppression

Cycle 0003 handles the easy case: file unchanged → return cached
outline. This cycle handles the hard case: file changed → return
the structural diff between what you saw last and what exists now.

Together they cover all re-reads:
- Unchanged → cache hit (cycle 0003)
- Changed → structural delta (this cycle)

## Playback questions

### Agent perspective

1. When I re-read a changed file, do I get a structural diff
   showing added/removed/changed symbols?
2. Is the diff small enough to be useful? (Not just "file changed"
   but not the entire new outline either.)
3. Can I still get the full new outline if I want it?
4. Does the diff tell me which symbols I should re-read with
   read_range?

### Operator perspective

1. Can I see structural diffs in stats/receipts?
2. Is the observation cache updated after returning a diff?

## Non-goals

- **No cross-session persistence.** Same constraint as re-read
  suppression — cache lives in server memory.
- **No WARP dependency yet.** This uses the existing observation
  cache (Map + hash) with outline diffing. The WARP worldline
  comes later.
- **No symbol identity tracking.** Symbols are matched by name
  within the same file. If a function is renamed, it shows as
  one removal + one addition. True identity tracking is WARP
  Level 2+.

## Design

### Outline diff

When a file has changed since last observation:

1. Read and parse the new file (tree-sitter outline).
2. Retrieve the cached outline from the observation.
3. Diff the two outlines by symbol name:
   - **Added**: symbols in new but not in old
   - **Removed**: symbols in old but not in new
   - **Changed**: symbols in both but with different signatures
     or different line ranges (structural change)
   - **Unchanged**: symbols in both with same signature

```typescript
interface OutlineDiff {
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];     // includes old and new signature
  unchangedCount: number;   // how many symbols didn't change
}

interface DiffEntry {
  name: string;
  kind: string;
  signature?: string;       // new signature (or old for removed)
  oldSignature?: string;    // only for changed
  start?: number;           // line number in new file
  end?: number;
}
```

### Response shape

New projection: `"diff"` with reason `"CHANGED_SINCE_LAST_READ"`.

```typescript
{
  path: string;
  projection: "diff";
  reason: "CHANGED_SINCE_LAST_READ";
  diff: OutlineDiff;
  outline: OutlineEntry[];     // full new outline (for context)
  jumpTable: JumpEntry[];      // full new jump table
  actual: { lines: number; bytes: number };
  readCount: number;
  lastReadAt: string;          // when agent last saw this file
}
```

The agent gets the diff (what changed) AND the new outline (for
navigation). The diff is the headline; the outline is the reference.

### Integration into safe_read

When the observation cache finds a hash mismatch (file changed):
1. Instead of just invalidating and doing a fresh read, compute
   the outline diff first.
2. Return the diff projection.
3. Update the observation cache with the new state.

This replaces the current behavior where a changed file just falls
through to a normal safe_read (content or outline based on size).

### New MCP tool: `changed_since`

Optional standalone tool for explicit delta queries:

```
changed_since(path) → OutlineDiff | "no previous observation"
```

This is useful when the agent wants to check for changes without
triggering a full safe_read.

### Reason code

Add `CHANGED_SINCE_LAST_READ` to the enum (16 total).

## Test strategy

- `test/unit/parser/diff.test.ts` — outline diffing: added,
  removed, changed, unchanged detection. Edge cases: empty files,
  all-new, all-removed.
- `test/unit/mcp/changed.test.ts` — safe_read returns diff
  projection on changed files. Observation cache updated after
  diff. changed_since tool. Receipt includes diff metadata.
