# FileSystem port

Extract a portable FileSystem port interface. Core logic imports
the port, not `node:fs`. Node adapter implements it.

## Port interface

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<{ size: number }>;
}
```

## Files touched

- `src/ports/filesystem.ts` — port interface
- `src/adapters/node-fs.ts` — Node implementation
- All `src/operations/*.ts` — import port instead of node:fs
- `src/metrics/logger.ts` — import port
- `src/mcp/server.ts` — inject adapter at creation

## Done criteria

- [ ] Zero `import * as fs from "node:fs"` in `src/operations/`
- [ ] Zero `import * as fs from "node:fs"` in `src/metrics/`
- [ ] Core logic is testable with a mock filesystem
- [ ] All existing tests pass

See: audit Phase 3. Effort: M
