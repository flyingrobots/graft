---
title: "Cross-language qualified reference verification witness"
---

# Verification witness

- Cycle: `WARP_cross-language-qualified-reference-resolution`
- Date: `2026-08-04`
- Branch: `feature/python-import-resolution`
- Full-suite code head: `3ced7293`
- Final acceptance code head: `3ced7293`

## Acceptance Coverage

- A typed language-adapter contract and shared adapter fixtures cover Python,
  TypeScript, TSX, JavaScript, Rust, and Go qualified accesses and lexical
  scopes.
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
- Rust fixtures also cover direct `crate`, `self`, and `super` paths plus
  ambiguous crate-root inline modules. TypeScript fixtures cover import-equals
  aliases, and TypeScript/TSX/JavaScript fixtures exclude namespace-member
  mutations while preserving language-correct extensionless module precedence.
- MCP and CLI fixtures cover command parsing, schemas, capability registration,
  generated model parity, structured diagnostics, and human review rendering.
- Exact-ref scans take precedence over stale WARP edges, reuse one repository
  analysis per review, and fail import diagnostics closed when parsing is
  incomplete.

## Focused Validation

```bash
pnpm exec vitest run \
  test/unit/warp/qualified-reference-resolver.test.ts \
  test/unit/warp/qualified-reference-language-adapters.test.ts \
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

Result: `15` test files and `206` tests passed.

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
- final isolated full suite passed: `252` test files and `1974` tests.

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

The final Code Lawyer closure repaired all `19` original findings from the
current-head self-audit in focused commits:

- `9f99d2a2` prefers exact-ref committed scans over potentially stale WARP
  evidence;
- `dd8811c4` reuses one structural-reading analysis per review;
- `1e1f3122` respects nested Go module boundaries;
- `4f52de05` models Python exception-target lifetime;
- `744cc68a` honors Python `global` and `nonlocal` declarations;
- `1f352c60` enforces Python class-namespace visibility;
- `b1b708fe` excludes Python qualified writes from caller inference;
- `606b97d8` separates TypeScript value and type shadows;
- `308222da` scopes JavaScript parameters across default expressions;
- `da5fa18d` scopes named JavaScript function and class expressions;
- `fc79d737` resolves Rust qualified type references;
- `c6d80770` honors Rust module namespace separation;
- `9372b733` limits Rust item shadows to their declaration lists;
- `19ce94b6` resolves direct Rust module declarations;
- `d66ef8bb` classifies unresolved dynamic references;
- `c9d01fb2` fails incomplete import-diagnostic scans closed;
- `4ff5ac8d` splits qualified-reference logic behind the shared language-adapter
  contract;
- `f51fa241` formats this witness's cycle metadata; and
- `e7fd5434` records the published validation and disposable-repository
  evidence from that closure.

Thirteen late Codex threads arrived after the self-audit. Eight duplicated
repairs above. The remaining five distinct findings were closed by:

- `1fd176d5`, which lets later function-local Python imports supersede earlier
  same-name local shadows;
- `ce59b677`, which resolves nested Rust module paths to their child declaring
  files;
- `9877f997`, which adds exact regression coverage for chained Python
  assignment targets already handled by the shared pattern extractor;
- `5c003b74`, which inspects unresolved leaves inside mixed Rust `use`
  declarations; and
- `cfeaa81a`, which adds exact regression coverage for static-import Python
  `getattr` confidence already repaired by `d66ef8bb`.

All `24` distinct findings are closed. At `cfeaa81a`, the full GraphQL audit
reported `81` review threads and zero unresolved threads. The focused
acceptance set passed `15` files and `196` tests, and the Docker-isolated
repository suite passed `252` files and `1964` tests. Lint, typecheck, build,
structural-history artifact parity, agent-worktree hygiene, and whitespace
validation also passed.

The subsequent exact-head CodeRabbit review and final review-body audit closed
another twelve repair items:

- `d1bfa91d` preserves Python dotted dynamic-import segments that resemble
  source-file extensions;
- `5b4127b5` records unresolved inline Rust module paths as partial confidence;
- `a1ed5539` asserts every language-adapter operation in the contract fixture;
- `1fa58364` avoids unused ancestor walks in TypeScript and Go shadow passes;
- `2f87c062` makes the adapter registry exhaustive at compile time;
- `1565d0ff` reports pinned commits in incomplete-diagnostics failures;
- `d6f1675f` shares Python import-clause decoding across binding and direct
  reference analysis;
- `e9c0c427` retains exact-scan failure reasons in fallback evidence;
- `2b9fd230` anchors partial review confidence to structured result fields;
- `d0ac4f38` deduplicates repeated unresolved Go selector uncertainty;
- `7e638412` resolves Python loop iterables before non-function target
  assignment while preserving function-local lexical shadowing; and
- `e8dd3011` derives the public adapter-language list from the exhaustive
  registry as its sole authority.

The older lazy-WARP-query nit was already enforced by `9f99d2a2` and its
no-acquisition regression, so it required no duplicate change. At `e8dd3011`,
a delayed Codex review independently reported the duplicate-registry issue
already fixed by that commit; its outdated thread was resolved with
current-head proof. The final full GraphQL audit reported `84` review threads
and zero unresolved threads. The focused acceptance set passed `15` files and
`200` tests, and the Docker-isolated repository suite passed `252` files and
`1968` tests. Lint, typecheck, build, structural-history artifact parity,
agent-worktree hygiene, and whitespace validation also passed.

The next exact-head Codex review opened five threads representing four distinct
correctness findings; two threads duplicated the same crate-root Rust defect.
This Code Lawyer pass also found two additional registry and mixed-source
resolution defects. All six distinct issues were closed in focused commits:

- `fe40b98b` records unresolved crate-root inline Rust aliases against every
  applicable `lib.rs` or `main.rs` owner;
- `5d289827` resolves TypeScript import-equals aliases as first-party namespace
  bindings;
- `bf538f76` resolves direct Rust `crate`, `self`, and `super` value and type
  paths without requiring a local `use` binding;
- `3da6989e` excludes TypeScript, TSX, and JavaScript namespace-member
  mutations from caller counts while retaining partial-confidence evidence;
- `1b6cbc8b` uses caller-language precedence for extensionless JavaScript and
  TypeScript imports while preserving compiled specifier resolution; and
- `3ced7293` derives runtime language membership from the exhaustive adapter
  registry.

At `3ced7293`, the full GraphQL audit reported `89` review threads and zero
unresolved threads. The focused acceptance set passed `15` files and `206`
tests, and the Docker-isolated repository suite passed `252` files and `1974`
tests. Lint, typecheck, build, structural-history artifact parity with Wesley
`0.1.0`, agent-worktree hygiene, and whitespace validation also passed.

## CLI Witness

```bash
pnpm graft struct import-diagnostics --ref HEAD --json
```

On the final code head, the command exits non-zero with
`import_diagnostics_incomplete`. That is the required fail-closed result:
Graft intentionally tracks `test/fixtures/broken.ts`, and the configured
Tree-sitter grammar also reports incomplete parses for several newer
TypeScript type forms. Returning an empty diagnostic set would incorrectly
claim repository-wide completeness. The successful response schema
`graft.cli.struct_import_diagnostics`, exact-ref behavior, and structured empty
and non-empty diagnostic sets are verified in clean disposable repositories by
the CLI, MCP, and output-contract tests included above.

## Disposable SalesOS Witness

The witness used a `git clone --no-local` disposable clone under `/tmp`. The
real `/Users/james/git/salesos` checkout was not modified.

Starting from current SalesOS commit
`26c11c204a450a940bfd9f56d1a7a371689d5e5b`, the first disposable signature
change produced synthetic head
`363683ddcad9277483fa72d5b42b219b5971da4a`. A cold
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
`fbbcc5edc5260841df9cb28144ad61fbd4e56151`, followed by a signature-only head
`2c6fe2d306bd6af3ac9d41a3dbca9b6a70838f96`. A second cold review reported:

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
