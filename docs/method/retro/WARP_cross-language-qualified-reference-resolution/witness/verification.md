---
title: "Cross-language qualified reference verification witness"
---

# Verification witness

- Cycle: `WARP_cross-language-qualified-reference-resolution`
- Date: `2026-08-04`
- Branch: `feature/python-import-resolution`
- Full-suite code head: `577a0140`
- Final acceptance code head: `577a0140`

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
  comprehensions, loops/ranges, catches, generators, switch/select clauses,
  Rust closures and patterns, and Go type-switch/receive bindings. Repeated
  accesses under one shadow produce one diagnostic.
- Rust fixtures cover grouped `use` trees and Cargo auto-target crate roots;
  computed TypeScript/JavaScript namespace access is excluded with
  symbol-specific partial confidence.
- MCP and CLI fixtures cover command parsing, schemas, capability registration,
  generated model parity, structured diagnostics, and human review rendering.

## Focused Validation

```bash
pnpm exec vitest run \
  test/unit/warp/qualified-reference-resolver.test.ts \
  test/unit/warp/qualified-reference-index.test.ts \
  test/unit/warp/committed-reference-scan.test.ts \
  test/unit/warp/index-head.test.ts \
  test/unit/warp/go-reference-context.test.ts \
  test/unit/warp/python-import-resolver.test.ts \
  test/unit/warp/ast-import-resolver.test.ts \
  test/unit/mcp/import-diagnostics.test.ts \
  test/unit/mcp/structural-review-cold-warp.test.ts \
  test/unit/warp/structural-reading-adapter.test.ts \
  test/unit/cli/command-parser.test.ts \
  test/unit/cli/structural-review-render.test.ts \
  test/unit/contracts/output-schemas.test.ts \
  test/unit/echo/generated-model-parity.test.ts
```

Result: `14` test files and `167` tests passed.

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
- the first isolated run found one stale generated backlog DAG after this
  cycle added a bad-code card. The owning generator repaired the DOT and SVG
  in `e3cc2006`.
- final isolated full suite passed: `251` test files and `1932` tests.

## Post-Retro Acceptance Closure

The exact pre-feature serialized TypeScript import-resolver fixture was
restored in `a134fbb2` after a final acceptance-contract audit found that an
earlier review repair had weakened it to structural-only assertions. The
restored byte-identical assertion passed alongside the structural assertions:
`4` compatibility test files and `31` tests passed, followed by focused lint,
full typecheck, and whitespace validation.

The requested final-head Codex review then found two additional language
edges. Commit `385b6dfe` counts direct symbols imported through grouped Rust
`use` trees. Commit `d74544c5` preserves the enclosing-module access in a
Python comprehension's outermost iterable while retaining conservative local
scope for its element and later clauses. Both regressions are included in the
final focused and isolated-suite totals above; all three review threads from
that round are resolved.

A later Code Lawyer pass closed the remaining current-head findings in focused
commits:

- `3bbb26b4` scopes Python walrus targets to their enclosing lexical scope;
- `4f5a39b4` prevents function-local imports from activating before their
  declaration while retaining their function-wide local binding;
- `9143eaa3` resolves TypeScript declaration-only modules on both qualified and
  static import paths;
- `da9552bd` normalizes quoted and raw-string Go module coordinates;
- `33778168` resolves Rust `self` and `super` paths through enclosing inline
  modules;
- `17395cdc` downgrades parse-error committed scans from false complete counts
  to partial confidence;
- `c2149ae6` confines Rust inline-module imports to their declaration lists;
- `7b3a3b57` gives empty first-party Go package diagnostics a meaningful target
  directory;
- `2f8075ce` keeps Python class-body imports out of nested function, lambda, and
  class bodies;
- `76d0443a` marks possible cross-file inline Rust module aliases partial at the
  nearest physical owner instead of inventing an edge;
- `cbca42ea` treats bare Python deletion targets as whole-function shadows; and
- `577a0140` treats TypeScript enums as lexical namespace shadows.

The exact-head Rust declaration-list thread duplicated the already-landed
`c2149ae6` regression and was resolved with current-head proof rather than a
redundant commit. At `577a0140`, the full GraphQL audit reported `58` review
threads and zero unresolved threads. The focused acceptance set passed `14`
files and `167` tests, and the Docker-isolated repository suite passed `251`
files and `1932` tests. Lint, typecheck, build, structural-history artifact
parity, agent-worktree hygiene, and whitespace validation were also green.

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

Starting from current SalesOS commit
`26c11c204a450a940bfd9f56d1a7a371689d5e5b`, the first disposable signature
change produced synthetic head
`22f78917c27be85a53a3dab31f8bfadebc18504d`. A cold
`graft struct review --json` reported the repository's unchanged direct test
caller:

- breaking symbol: `pending_ids`;
- declaring file: `coqui/matcher/sources.py`;
- direct impacted file: `coqui/tests/test_sources.py`;
- impact count: `1`;
- confidence: `complete`;
- shadow warnings: none.

The disposable history then added an unchanged qualified
`sources.pending_ids` caller at `coqui/matcher/cli.py` in synthetic baseline
`70571ae37151e98c4cb9755859bbee34197c55f8`, followed by a signature-only head
`7e71d406fee41834069c5bc4dd39f04796acf246`. A second cold review reported:

- direct impacted files: `coqui/matcher/cli.py` and
  `coqui/tests/test_sources.py`;
- impact count: `2`;
- confidence: `complete`;
- shadow warnings: none.

No WARP graph/index files existed in the clone; the command created only its
runtime log. The current real SalesOS checkout has no production
`pending_ids` call in `coqui/matcher/cli.py`, so the CLI caller was deliberately
synthetic to verify the planned unchanged-caller path without modifying
`/Users/james/git/salesos`. The disposable clone was moved to Trash after
verification, and the real checkout remained clean at its original commit.
