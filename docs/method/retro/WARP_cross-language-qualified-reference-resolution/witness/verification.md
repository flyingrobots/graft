---
title: "Cross-language qualified reference verification witness"
---

# Verification witness

Cycle: `WARP_cross-language-qualified-reference-resolution`
Date: `2026-08-03`
Branch: `feature/python-import-resolution`

## Acceptance Coverage

- Shared adapter fixtures cover Python, TypeScript, TSX, JavaScript, Rust, and
  Go qualified accesses and lexical scopes.
- WARP integration fixtures verify qualified symbol edges and retained
  import-level file edges for Python, TypeScript, Rust, and Go.
- The committed scanner fixture counts all four language families at an exact
  commit while ignoring an uncommitted working-tree caller.
- Go fixtures cover module ownership, aliases, declared package names, absent
  declarations, duplicate declarations, external imports, and test-file
  exclusion.
- Shadow fixtures cover parameters, locals, declarations, assignments,
  comprehensions, loops/ranges, catches, and Rust patterns. Repeated accesses
  under one shadow produce one diagnostic.
- MCP and CLI fixtures cover command parsing, schemas, capability registration,
  generated model parity, structured diagnostics, and human review rendering.

## Focused Validation

```bash
pnpm exec vitest run \
  test/unit/warp/qualified-reference-resolver.test.ts \
  test/unit/warp/qualified-reference-index.test.ts \
  test/unit/warp/committed-reference-scan.test.ts \
  test/unit/mcp/import-diagnostics.test.ts \
  test/unit/mcp/structural-review-cold-warp.test.ts \
  test/unit/warp/structural-reading-adapter.test.ts \
  test/unit/cli/command-parser.test.ts \
  test/unit/cli/structural-review-render.test.ts \
  test/unit/contracts/output-schemas.test.ts \
  test/unit/echo/generated-model-parity.test.ts
```

Result: `10` test files and `79` tests passed.

The cold-WARP Python review fixture changes the signature of
`coqui/matcher/sources.py:pending_ids` and reports
`coqui/matcher/cli.py` as the direct impacted file while returning partial
confidence for a separate parameter-shadowed access.

## Repository Validation

```bash
pnpm lint
pnpm typecheck
pnpm build
git diff --check
WESLEY_BIN=/Users/james/.cargo/bin/wesley pnpm schema:structural-history:check
pnpm guard:agent-worktrees
pnpm test
```

Results:

- lint passed.
- typecheck passed.
- local TypeScript build passed.
- whitespace validation passed.
- hermetic structural-history schema and Echo package checks passed with
  Wesley `0.1.0`.
- agent worktree hygiene passed.
- isolated full suite passed: `250` test files and `1868` tests.

The full suite includes the existing byte-identical TypeScript import-resolver
fixture.

## CLI Witness

```bash
pnpm graft struct import-diagnostics --ref HEAD --json
```

The command exited successfully with CLI schema
`graft.cli.struct_import_diagnostics`, `ref: "HEAD"`, and a structured empty
diagnostic set for the reviewed Graft commit.

## Disposable SalesOS Witness

The witness used a `git clone --no-local` disposable clone under `/tmp`. The
real `/Users/james/git/salesos` checkout was not modified.

Starting from SalesOS commit
`904aa491c646576f63d7e9e832e7e59152255cd0`, the disposable clone changed only
the `coqui/matcher/sources.py:pending_ids` signature and committed synthetic
head `d958d7eb326c08ac9fda81329d43eccd5eb1e17b`. A cold
`graft struct review --json` reported:

- breaking symbol: `pending_ids`;
- declaring file: `coqui/matcher/sources.py`;
- direct impacted file: `coqui/tests/test_sources.py`;
- impact count: `1`;
- confidence: `partial`;
- shadow warnings: none.

The current SalesOS CLI obtains the module through `_load_sources()` and then
assigns it to a local `sources` variable. Interprocedural alias inference is an
explicit non-goal, so those CLI accesses are deliberately excluded and the
partial-confidence result is the precision-preserving outcome. The disposable
clone was moved to Trash after verification.
