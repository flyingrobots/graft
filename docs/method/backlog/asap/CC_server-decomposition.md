# Server decomposition

Split the 541-line god file (`src/mcp/server.ts`) into focused
modules.

## Target structure

```text
src/mcp/
  server.ts       registration + plumbing only (~80 lines)
  cache.ts        Observation class with isStale(), record(), check()
  receipt.ts      Receipt builder (frozen value object)
  tools/
    safe-read.ts
    file-outline.ts
    read-range.ts
    graft-diff.ts
    changed-since.ts
    run-capture.ts
    state.ts
    doctor.ts
    stats.ts
```

## Done criteria

- [ ] server.ts under 100 lines
- [ ] Each tool handler in its own file
- [ ] Observation is a class with behavior (not a plain interface)
- [ ] Receipt is a frozen value object
- [ ] All existing tests pass unchanged

See: audit Phase 2. Effort: L
