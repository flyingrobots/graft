# CachedFile abstraction

A value object that bundles { rawContent, hash, outline, jumpTable,
actual } from a single file read. Passed through the pipeline so
every consumer works from the same snapshot.

Motivation: the snapshot race bug (PR #1, fixed in 3bf0296) happened
because fileOutline re-read the file independently. If all consumers
share a CachedFile, the race is eliminated by construction.

Pattern:
```typescript
interface CachedFile {
  path: string;
  rawContent: string;
  hash: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  actual: { lines: number; bytes: number };
}
```

Build once from a single readFileSync, use everywhere.
