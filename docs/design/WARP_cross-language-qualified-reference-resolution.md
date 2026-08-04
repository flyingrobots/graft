# WARP cross-language qualified reference resolution

## Hill

Make structural review count first-party qualified callers at an exact Git ref
without forcing a whole-repository WARP index, while ensuring that ambiguous
lexically shadowed bindings never create confident symbol edges.

## Acceptance criteria

- One language-adapter contract serves WARP indexing and the committed-ref
  fallback for Python, TypeScript, TSX, JavaScript, Rust, and Go. The registry
  composes focused binding, shadow, access, and orchestration modules rather
  than branching through one cross-language resolver monolith.
- Existing TypeScript named/default/namespace import output remains
  byte-identical; qualified member resolution is a supplementary pass.
- Python module and package-child imports resolve `module.member`, including
  namespace packages without `__init__.py`.
- TypeScript/TSX/JavaScript namespace imports resolve `namespace.member`.
- Rust `crate`, `self`, and `super` module bindings resolve
  `module::member`.
- Go imports resolve only when the path is owned by the nearest repository
  `go.mod` coordinate and exactly one non-test package file declares the
  selected exported symbol.
- Standard-library, third-party, wildcard, dynamic, and unresolved imports do
  not create qualified symbol edges.
- Parameters, locals, assignments, declarations, loops/ranges, catches,
  comprehensions, and pattern bindings create language-correct shadow regions.
  A shadow suppresses only the affected qualified symbol edge; import-level
  file evidence remains available.
- `graft_review` uses `committed-reference-scan` evidence pinned to the
  requested head whenever the exact-ref analysis succeeds. Bounded WARP graph
  evidence remains a partial fallback when that scan cannot be completed.
- Every breaking change includes `referenceConfidence` and
  `referenceWarnings`; only shadows affecting that changed symbol are shown.
- `graft_import_diagnostics` and
  `graft struct import-diagnostics [--ref <ref>] [--json]` report all
  first-party import-binding shadows at the requested ref.

## Playback questions

- Does a cold WARP review of a changed Python `pending_ids` signature find a
  `sources.pending_ids` caller at the reviewed commit?
- Do Rust and Go qualified callers produce the same `references` edge
  vocabulary as Python and TypeScript callers?
- Does a parameter or local shadow remove only accesses inside its lexical
  region while leaving outer and sibling accesses intact?
- Does Go refuse external module paths, absent declarations, ambiguous
  declarations, and `_test.go`-only declarations?
- Can a reviewer distinguish a complete zero from a partial count with
  deliberately excluded shadowed accesses?

## Non-goals

- Runtime import hooks, `importlib`, reflection, monkey patching, star imports,
  interprocedural aliases, or flow/type inference.
- Third-party dependency indexing or language-server/type-checker parity.
- GraphQL, JSON, TOML, YAML, and other configuration formats without
  first-party code-module binding semantics.
- Relaxing the bounded WARP indexing policy to obtain review counts.

## Test strategy

- Preserve the byte-identical TypeScript import-resolver fixture.
- Exercise each adapter with first-party, aliased, external, unresolved,
  repeated-access, and lexical-shadow fixtures.
- Index real temporary Python, TypeScript, Rust, and Go repositories and query
  their emitted symbol references.
- Scan temporary repositories at exact committed refs with dirty working-tree
  distractors.
- Validate the diagnostic MCP/CLI schemas, command parser, JSON output, human
  rendering, generated-model parity, and cold-WARP review behavior.
- Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` before cycle
  closeout. SalesOS verification, when needed, uses only a disposable clone.
