# Verification Witness for FIX_colorful-ir-numeric-outline-ids

## RED

After converting the Colorful fixtures to the real `colorful.syntax/v1` numeric
outline ID shape, the focused suite failed before the decoder fix.

Command:

```bash
pnpm exec vitest run test/unit/operations/colorful-prose-projection.test.ts test/unit/adapters/colorful-cli-prose-projector.test.ts test/unit/mcp/tools.test.ts
```

Result:

```text
Test Files  3 failed (3)
Tests  8 failed | 34 passed (42)
ColorfulIrProjectionError: Colorful IR.structure[0].nodeId must be a string
```

The MCP path also degraded to an empty or unsupported projection because the
Colorful projector rejected valid IR before building the outline.

## GREEN

Focused Colorful projection surface:

```bash
pnpm exec vitest run test/unit/operations/colorful-prose-projection.test.ts test/unit/adapters/colorful-cli-prose-projector.test.ts test/unit/mcp/tools.test.ts test/unit/mcp/cache.test.ts
```

Result:

```text
Test Files  4 passed (4)
Tests  59 passed (59)
```

Real installed Colorful CLI through the Graft source adapter:

```bash
PATH="$HOME/.colorful-language/bin:$PATH" pnpm exec tsx -e 'import { createColorfulCliProseProjector } from "./src/adapters/colorful-cli-prose-projector.ts"; import { nodeProcessRunner } from "./src/adapters/node-process-runner.ts"; const projector = createColorfulCliProseProjector({ processRunner: nodeProcessRunner, cwd: process.cwd() }); const result = projector.project({ path: "draft.txt", content: "The cat is here.\n" }); console.log(JSON.stringify({ format: result?.format, partial: result?.partial, spans: result?.syntaxSpans.length, outline: result?.outline.length, jumpTable: result?.jumpTable.length }));'
```

Result:

```json
{"format":"prose","partial":false,"spans":2,"outline":1,"jumpTable":2}
```

The command emitted a Node 26 `tsx` loader deprecation warning unrelated to the
projector behavior.

TypeScript and lint:

```bash
pnpm typecheck
pnpm lint
git diff --check
```

Result: all passed.

Full Docker-isolated test suite:

```bash
pnpm test
```

Result:

```text
Test Files  238 passed (238)
Tests  1770 passed (1770)
```
