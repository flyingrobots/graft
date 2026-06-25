# CLI Version Identity Verification

This witness records the bounded checks used to close
`SURFACE_cli-version-identity`.

## RED

Command:

```bash
pnpm vitest run test/unit/cli/main.test.ts
```

Expected before implementation: failure.

Observed before implementation:

```text
test/unit/cli/main.test.ts (22 tests | 4 failed)
```

The four failures covered missing version text in grouped help, missing version
text in no-argument help, `--version` falling through to command parsing, and
`-V` falling through to command parsing.

## GREEN

Command:

```bash
pnpm vitest run test/unit/cli/main.test.ts
```

Observed after implementation:

```text
test/unit/cli/main.test.ts (22 tests | 22 passed)
```

## Static checks

Commands:

```bash
pnpm typecheck
pnpm lint
git diff --check
```

Observed:

```text
typecheck passed
lint passed
whitespace check passed
```

## Built executable smoke test

Commands:

```bash
pnpm build
node bin/graft.js --version
node bin/graft.js -V
node bin/graft.js help
```

Observed:

```text
build passed
graft 0.10.0
graft 0.10.0
graft 0.10.0 CLI
```
