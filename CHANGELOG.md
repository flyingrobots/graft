# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **WarpPool lease tracking and eviction**: the required application pool port
  returns a unique, idempotently releasable capability for every acquisition,
  including repeated acquisitions by the same owner. `InMemoryWarpPool` tracks
  those capabilities per logical `(repoId, writerId)` resident. Releasing a
  resident's last lease now drops its in-process strong reference immediately;
  production cleanup does not depend on a test-only sweep, and the pool exposes
  no manual or forced eviction path that can revoke another capability's
  resident. Raw pooled lookup and holder-ID release are private implementation
  details rather than callable application operations, and test fakes implement
  owned acquisition explicitly. Daemon transport close/error and daemon shutdown
  release every active or routed binding lease owned by the session. Shutdown
  closes session admission synchronously, rejects initialize requests whose
  bodies cross that boundary, and drains already admitted initialization before
  snapshotting sessions for transport, lease, and directory cleanup. If MCP
  transport connection fails after a session is published, the same retirement
  owner removes its control-plane record, releases its leases, and removes its
  directory before the initialize error returns. Outer daemon shutdown now
  attempts session, monitor, worker, HTTP, and socket cleanup in order before
  reporting any aggregate cleanup failure, so one failed stage cannot leave the
  listener alive by skipping the remaining stages.
  A successful cross-resident rebind releases the previous binding only after
  the replacement commits. Same-resident rebinds transfer an already acquired
  capability, while an unacquired lazy lease is recreated with the replacement
  worktree root so later opening cannot depend on a removed checkout.
  Concurrent binding commits serialize from current-binding capture through
  displaced-capability release, so one winner cannot be orphaned by a later
  commit. Current and routed bindings in one transport session own distinct
  capabilities, so evicting one cannot release another binding's resident.
  Routed authorization rejection, same-worktree replacement, and LRU overflow
  all dispose the exact displaced binding; cleanup of an older entry cannot
  delete a newer cache replacement.
  If history or authorization setup rejects after opening a replacement,
  binding rollback releases only the uncommitted capability and preserves the
  previous active binding. Routed repo-state initialization failure likewise
  unregisters its never-cached binding capability before propagating the
  original error. Repo-local startup now applies the same rollback before
  publishing its initial binding, so rejected repo-state or persisted-history
  setup cannot pin an unreachable resident for the server lifetime.
  Failed opens roll back only the unique capability token introduced by the
  failed acquisition, preserve leases for sibling writer lanes, and cannot
  delete a newer replacement resident when an older open rejects late.
  A real Git-backed reconstruction witness now indexes a bounded structural
  projection, releases the lane's last resident capability, reopens the same
  `(repoId, writerId)` through `openWarp`, and proves the projection is
  semantically identical.
  Routed tool executions hold independent invocation leases through handler,
  attribution, and failure settlement, so binding LRU eviction cannot remove an
  admitted call's resident; the invocation lease releases in `finally`.
  Bound daemon repository calls outside the scheduled/routed tool set now own
  the same invocation capability without entering the scheduler. Direct graph
  tools, persisted-history/status reads, overlay reads, and causal attach writes
  all use the captured execution scope, so a concurrent rebind cannot revoke or
  redirect their WARP resident before settlement.
  Internal read-attribution execution contexts now release their owned lease in
  the same operation, including early returns and failures. Runtime causal-status
  projection reads the bound state directly and does not manufacture an
  unowned execution lease. Daemon health and status now expose unique repository
  count separately from logical `(repoId, writerId)` resident count, without
  presenting either as a measurement of unrelated daemon memory.

### Fixed

- **Daemon WARP writer identity**: the production daemon now forwards each
  requested logical writer ID into `openWarp`, so distinct transport sessions
  use their derived session lanes instead of silently sharing the default
  `graft` writer.
- **Requested-worktree authority**: daemon-routed repository reads now expose
  the absolute caller-requested root, canonical resolved worktree root, and
  resolved repository/worktree identities in both `_workspace` and
  `_receipt.workspace`. Routed resolution failures retain typed error codes,
  optional client identity hints fail closed when they contradict Git, active
  binding reuse and authorization both require the full resolved repository
  identity, path replacement cannot transfer authority between repositories,
  and a two-worktree `graft_since` regression proves that the active checkout cannot
  override an explicit `cwd`. Workspace-route output contracts reject empty or
  relative requested and resolved roots. The nine previously-version-1 routed
  MCP output contracts and their eight previously-version-1 direct CLI peers advertise
  schema version `2.0.0` for the added workspace-route evidence. Because
  `file_outline` and `read_outline` already used version `2.0.0`, those two
  contracts advance to `3.0.0` instead of changing an existing strict shape in
  place.

## [0.12.0] - 2026-08-09

### Added

- **Import binding diagnostics**: `graft_import_diagnostics` and
  `graft struct import-diagnostics` report structured first-party import
  shadows at an exact Git ref across Python, TypeScript/JavaScript, Rust, and
  Go.

### Changed

- **Release dependency security**: the release graph now resolves patched
  transitive versions of `tar`, `brace-expansion`, `fast-uri`, `hono`,
  `ip-address`, `postcss`, and `nanoid`, restoring the zero-high/critical
  advisory release gate without changing Graft's direct dependency majors.
- **Portable filesystem absence handling**: filesystem adapters may classify
  custom missing-path errors explicitly, while the live workspace boundary
  also recognizes standard portable missing-error shapes. Only confirmed
  absences become `ENOENT`, preserving non-Node not-found projections without
  swallowing permission or resource failures.
- **Code-show observation consistency**: live symbol search now carries the
  exact matched content through policy evaluation and range projection, so
  `code_show` observes each matched file once instead of re-reading mutable
  working-tree content between those stages. Match-only `code_find` and
  precision searches discard source after extracting matches instead of
  retaining every matched file through a repository-wide scan.
- **Snapshot admission diagnostics**: `SnapshotAdmissionError` now exposes a
  stable machine-readable code for each refused snapshot contradiction while
  retaining its descriptive message and detail.
- **Admitted snapshot immutability**: admitted descriptors, their aperture,
  read-view evidence, and the evidence property itself are frozen or locked
  after defensive copying. Admission validates that exact copy before retaining
  it, so mutable or effectful caller collections cannot detach reported
  provenance from retained bytes. Snapshot views keep retained bytes and
  aperture state in module-private storage so reflection or property injection
  cannot replace the content served under frozen evidence, and the completed
  view and exported authority prototype are frozen so callers cannot shadow or
  globally replace its authority methods. The admitted view is runtime-final,
  so a derived prototype cannot override those methods beneath valid evidence.
- **Repo workspace compatibility**: the semver-public `RepoWorkspace`
  constructor and `fs` member remain available to filesystem-backed callers.
  Analysis methods normalize that input to one `LiveWorkspaceReadSource`; new
  callers may supply `readView` directly. The normalized read authority is
  locked after construction so later property injection cannot redirect
  snapshot-backed analysis to live or forged bytes. Admitted views must name
  the same workspace root as their `RepoWorkspace`; mismatches throw the
  exported `WorkspaceRootMismatchError` with code `WORKSPACE_ROOT_MISMATCH`.
- **Admitted snapshot path identity**: snapshot views translate an absolute
  path beneath their exact evidence root back to the workspace-relative key
  carried by the admitted aperture. Standard traversal-protecting repository
  resolvers therefore compose with settled reads without turning admitted
  files into `UNADMITTED_PATH` refusals. Mapping follows the evidence root's
  path syntax: POSIX backslashes remain literal filename characters, while
  Windows drive and backslash-UNC roots accept either separator without
  aliasing a distinct POSIX path into admitted authority.
- **Outline output schema**: MCP `file_outline` and CLI `read_outline` now
  advertise schema version `2.0.0` for the cache-hit `actual` field. Wrapped
  and split body schema exports now share that contract; unrelated output
  contracts remain on their existing versions.
- **Invalid UTF-8 refusal metrics**: governed outline and range reads now emit
  the standard refusal projection for undecodable text, so tool metrics count
  those outcomes as refusals instead of successful outlines or reads. Refused
  outlines are also excluded from persisted successful-read attribution.
  MCP `changed_since` now delegates to the same workspace authority instead of
  replacement-decoding bytes through its own filesystem path, so invalid text
  is reported as `INVALID_UTF8` there as well.
- **Range provenance**: `read_range` records a requested line region only when
  it returns range content; refused and otherwise empty results retain the
  considered path without claiming that its region was accessed.
- **Snapshot read errors**: `UnadmittedPathError` and
  `MissingSnapshotBytesError` expose stable `UNADMITTED_PATH` and
  `MISSING_SETTLED_BYTES` codes alongside their descriptive messages.

- **Qualified reference confidence**: WARP indexing and cold-graph structural
  review now resolve first-party qualified module/package members across
  Python, TypeScript/JavaScript, Rust, and Go. Shadowed accesses are excluded
  from symbol edges and review counts, and breaking changes expose
  `referenceConfidence` plus relevant `referenceWarnings` without forcing a
  full WARP index. Absent or ambiguous Go declarations continue to emit no
  inferred symbol edge and now make the matching review count explicitly
  partial. Python assignment-expression targets inside comprehensions retain
  their enclosing lexical scope, and function-local imports shadow outer
  bindings before activating their imported module target. Declaration-only
  TypeScript modules participate in both qualified and static import
  resolution, and quoted Go module directives match their unquoted import
  paths. Rust `self` and `super` imports include enclosing inline-module paths,
  inline-module import aliases remain within their declaration lists, and
  aliases that may name an inline module in another file conservatively make
  matching owner-file counts partial instead of returning a complete zero.
  Python class-body imports remain visible to the class body without leaking
  into nested method, lambda, or class bodies, and bare `del` targets suppress
  imported-module inference throughout their containing function. Local
  TypeScript enum declarations suppress imported namespace inference in their
  lexical scope.
  Exact-ref committed scans now run before WARP acquisition, so a cold or
  unavailable graph cannot prevent authoritative committed-reference counts.
  When exact-ref scanning fails and bounded WARP evidence is used, the
  translated evidence now retains the scan failure reason.
  Incomplete import-diagnostics errors now identify the pinned commit that was
  analyzed rather than the caller's potentially moving symbolic ref.
  Each structural review now reuses one reading port across all breaking
  symbols, preserving its repository-analysis cache.
  Go package inference now stops at nested `go.mod` boundaries instead of
  attributing nested-module declarations to an importing parent module.
  Python exception aliases are now treated as function-wide locals and remain
  unavailable after handler cleanup in their defining module or class scope.
  Python `global` and `nonlocal` declarations preserve qualified import
  references before reassignment and suppress them only from the reassignment
  point onward.
  A later function-local Python import now supersedes earlier same-name local
  bindings for accesses after that import, while pre-import accesses remain
  excluded.
  Python class imports and class-local shadows now follow class-namespace
  visibility: they do not leak into nested bodies or comprehension bodies,
  while the outermost comprehension iterable still sees the class namespace.
  Python loop iterables at module and class scope, and loops targeting a
  `global` or `nonlocal` name, resolve before the loop target is assigned;
  function-local loop targets remain lexical across the whole function.
  Python qualified attribute writes and deletions no longer count as callers;
  matching exact-ref reviews report partial confidence for those unsupported
  monkey-patching semantics.
  First-party Python wildcard imports likewise emit no speculative caller edge
  while making exact-ref review counts for the imported module partial.
  TypeScript, TSX, and JavaScript namespace-member assignments, updates, and
  deletions receive the same precision-preserving partial-confidence posture.
  TypeScript value bindings now shadow value-qualified accesses without
  suppressing independent type-namespace references; class and enum
  declarations continue to shadow both meanings.
  TypeScript `import alias = require("./module")` bindings now resolve the same
  first-party qualified member references as namespace imports.
  Extensionless JavaScript namespace imports prefer JavaScript source files in
  mixed-source trees, while TypeScript callers retain TypeScript-first and
  compiled `.js`-specifier resolution.
  Repository-root TypeScript and JavaScript namespace imports now resolve from
  the repository root instead of the importing file's directory.
  TypeScript and JavaScript parameter bindings now cover their full default-
  initializer environment, including self-references and references to later
  parameters.
  Named TypeScript and JavaScript function and class expressions now shadow
  matching imported namespaces only within their expression bodies, with
  function names remaining value-only in TypeScript.
  Rust qualified type paths such as `api::Target` now produce the same
  declaring-symbol reference evidence as qualified value paths.
  Direct Rust `crate::`, `self::`, and `super::` paths now resolve qualified
  value and type references without requiring a local `use` binding.
  Nested Rust paths such as `api::nested::run()` now resolve through the
  imported parent module to the child module's declaring file.
  Nested Rust paths whose child module has no distinct source file now lower
  matching owner-file confidence instead of disappearing from the analysis.
  Possible crate-root inline modules conservatively lower confidence for every
  applicable `lib.rs` or `main.rs` owner.
  Rust value parameters, locals, patterns, functions, constants, and statics
  no longer shadow module paths; type/module items and generic type parameters
  remain conservative type-namespace shadows.
  Rust type/module item shadows are now confined to their nearest block or
  inline-module declaration list instead of suppressing sibling modules.
  Mixed Rust `use` declarations now retain resolved first-party leaves while
  conservatively shadowing same-name unresolved or external leaves.
  External Rust declarations such as `mod api;` now bind the corresponding
  first-party module file for qualified value and type references, including
  paths nested in inline modules.
  Exact-ref scans now normalize relative Python `importlib` specifiers and
  conservatively report partial confidence for nonliteral dynamic import
  targets or member names that could affect the reviewed symbol.
  Python dynamic module names preserve extension-like final segments such as
  `pkg.go` instead of misclassifying them as source-file suffixes.
  Import-diagnostic scans now fail closed when a supported source at the
  pinned ref contains parse errors, preserving the exhaustive meaning of a
  successful `{ ref, diagnostics, summary }` response.
  Qualified-reference inference now uses a typed per-language adapter registry
  over separate contract, binding, shadow, access, and orchestration modules;
  the TypeScript import resolver remains an independent unchanged pass.
  Runtime supported-language membership is derived from that exhaustive
  adapter registry instead of repeating a second language list.
  Go shadow diagnostics fall back to a meaningful package directory when an
  imported first-party package has no tracked source file.
  Committed scans containing supported-language parse errors report partial
  confidence rather than a false complete result. The expanded `graft_review`
  / `struct_review` wire contract is versioned as `2.0.0`; unchanged output
  contracts remain at `1.0.0`.

- **CI test feedback**: pull request CI now keeps the release-grade
  Docker-isolated full test suite on the Node 22 lane while making the Node 20
  lane an explicit host-side package compatibility smoke, avoiding a duplicate
  Dockerized full-suite run that did not actually execute inside Node 20.

## [0.11.1] - 2026-07-05

### Added

- **Release workflow guidance**: contributor guidance now requires operators to
  inspect the tag-triggered GitHub Actions release workflow, individual job
  state, job logs, GitHub Release assets, and npm registry state before
  claiming release or publish success. It also records the release invariant
  that releases must be cut only from version-tagged commits already on `main`;
  release branches, pull request heads, local-only commits, and untagged commits
  are not release authorities.

## [0.11.0] - 2026-07-05

### Added

- **Obstruction receipt projection preservation**: Edict projection bundles now
  include an explicit `echoReceipt` slot so future Edict projection providers
  can pass Echo obstruction receipt review payloads through Graft without
  reclassifying them as hard rejections or scheduler counterfactuals. Graft
  preserves the outcome kind, Target IR digest, reason kind, reason payload, and
  opaque receipt review object, while rejecting top-level `receiptDigest` fields
  until canonical Echo receipt bytes exist. `StructuredBuffer` keeps the default
  Edict CLI request limited to syntax, diagnostics, Core, and Target IR; this
  slice does not execute Echo, admit Jim artifacts, canonicalize receipt bytes,
  or interpret obstruction semantics.
- **Profile-aware Wesley SDL provider seam**: projection registries can now
  register a Wesley provider for `.graphql` and `.graphqls` buffers. When a
  `projectionProfileResolver` resolves `wesley-sdl` authority context,
  `createStructuredBuffer(...)` and `createProjectionBundle(...)` pass dirty
  buffer text, basis, emit set, and the exact `ResolvedAuthorityContext` to the
  provider, surface Wesley syntax and diagnostics through the common projection
  slots, expose the Wesley projection sidecar through
  `StructuredBuffer.wesleyProjection()`, and preserve authority-owned payload
  lanes without interpreting descriptor semantics. Wrong-profile diagnostics
  remain provider-owned, mismatched registry provider kinds fail closed, and
  provider failures surface as
  `PROJECTION_PROVIDER_UNAVAILABLE`. This slice does not add TOML discovery,
  Wesley CLI/WASM transport, Echo execution, Jim admission, or settlement
  authority.
- **Projection authority context bundles**: `createStructuredBuffer(...)` and
  `createProjectionBundle(...)` can now accept a `projectionProfileResolver`
  plus optional `profile` override, attach the resolved authority context to
  warm projection bundles, and pass that same context to registry-routed
  providers. Bundles distinguish `not_configured`, `resolved`, and `failed`
  authority states so editor hosts can display profile ids, profile digests,
  routing digests, provider ids, language ids, and semantic extension
  identities before the profile-aware Wesley provider lands. Resolver failures
  are surfaced as structured projection results and skip provider invocation;
  this slice does not parse `graft.projections.toml`, interpret Wesley SDL, run
  Echo, admit Jim artifacts, or claim settlement authority.
- **Projection profile resolver**: editor hosts can now construct an in-memory
  `ProjectionProfileResolver` with `createProjectionProfileResolver(...)` to
  resolve dirty-buffer names to projection authority context before the
  profile-aware Wesley provider lands. The resolver computes deterministic
  `profileDigest` and `routingDigest` review strings, treats blank profile
  overrides as absent, returns structured failures for unknown profiles,
  ambiguous route matches, and no-provider cases, and keeps profile identity
  separate from routing identity. Resolver config rejects lossy digest
  preimages, sparse option arrays, fallback/profile language mismatches,
  negated route globs, and malformed fallback file extensions before
  resolution. Profile digests preserve JSON option keys named `__proto__` and
  are independent of semantic extension declaration order using locale-free
  code-point comparison. The resolver itself does not parse
  `graft.projections.toml` or interpret Wesley SDL, descriptor, Echo, Edict, or
  Colorful semantics.
- **Projection provider registry**: editor hosts can now create a
  `ProjectionProviderRegistry`, register an Edict provider by language id and
  file extension, and pass the registry to `createStructuredBuffer(...)` or
  `createProjectionBundle(...)`. The registry routes `.edict` buffers through
  the existing Edict projection provider, supports explicit `language` routing
  for synthetic dirty buffers, and keeps the direct `edictProjector` option for
  compatibility. Blank language ids are treated as absent during registry
  lookup. The registry is a routing shell for current and future provider
  bindings only; it does not execute Echo, admit bundles, or make Graft own
  language-specific semantics.
- **Edict projection bridge**: buffer-native editor integrations can now opt
  into an `EdictProjectionProvider` for `.edict` buffers. Graft exports
  `createEdictCliProjectionProvider(...)` and `EdictProjectionError`, shells out
  through the existing `ProcessRunner` port, sends dirty source text to Edict
  over stdin JSONL, maps Edict syntax byte offsets into Graft row/column spans,
  preserves compiler diagnostics, and exposes Core/Target IR projection slots
  with explicit `not_requested`, `available`, `blocked`, and `failed` states.
  Without a
  projector, `.edict` buffers are recognized and report
  `PROJECTION_PROVIDER_UNAVAILABLE`; this bridge does not execute Echo or admit
  bundles.

### Fixed

- **XML and SVG projection authority failures**: native XML/SVG syntax,
  outline, diagnostics, and fold projections now preserve
  `PROJECTION_AUTHORITY_UNAVAILABLE` instead of emitting fallback projection
  lanes when explicit profile resolution fails.

## [0.10.1] - 2026-06-25

### Added

- `graft --version` and `graft -V` now print the package version, and grouped
  help includes the same version identity without requiring repository or daemon
  initialization.

### Fixed

- **Colorful prose IR compatibility**: the prose projector now accepts
  `OutlineNode.nodeId: Int!` and `childNodeIds: [Int!]!` from the real
  `colorful.syntax/v1` contract, normalizing those integer IDs to Graft's
  internal string keys instead of rejecting valid `colorful ir` output.
- **Wesley release gate source**: CI and release workflows now install the
  project-declared `wesley-cli` from crates.io instead of a pinned Git revision,
  and the structural-history codec artifact has been regenerated with
  `wesley-cli 0.1.0` plus Graft's deterministic `Hash`/`Json` scalar shims.

## [0.10.0] - 2026-06-24

### Added

- **Colorful prose projection seam**: buffer-native projections can now opt into
  a `ProseProjectionProvider`, and Graft exports a Colorful CLI adapter for
  hosts that want `.txt` buffers projected through `colorful ir -` from
  `colorful >= 0.2.1`. The projector validates `colorful.syntax/v1`, the pinned
  vocabulary hash, the source content hash, and UTF-8 byte ranges before
  returning normal Graft syntax spans, paragraph/sentence outlines, and jump
  tables. MCP `file_outline` and large-file `safe_read` calls now use that
  adapter when `colorful >= 0.2.1` is available on `PATH`, while unsupported
  `.txt` behavior remains unchanged when no projector is configured or the CLI
  is unavailable.
- **Structural basis kind for unpinned committed history**: structural-history
  schema v0.2 adds `UNPINNED_COMMITTED` so committed git-warp readings with no
  `ref` and no `head` no longer masquerade as `GIT_REF` rows with a null
  `refName`. Wesley-generated declarations, LE-binary codecs, manifest hashes,
  the Echo package descriptor, and generated-model parity tests now pin that
  `GIT_REF` means a named ref basis.
- **Generated-model parity for structural readings** (slice 4, last
  Graft-only pre-Echo slice): `src/echo/structural-reading-generated-model.ts`
  maps git-warp-backed `StructuralReadingResult` values onto the
  Wesley-generated `StructuralReading`/`StructuralReadingEvidence`/
  `StructuralBasis` triple and back, loss-free. Ids and payload digests are
  sha256 over canonical JSON (deterministic, no clock, no randomness); the
  mapping refuses to emit `ECHO_NATIVE` from translated substrates with a
  typed error naming the `fallback_translated_is_not_native_continuum`
  invariant, and the reverse path raises typed obstructions for
  generated-only enum values, digest mismatches, and mismatched pairs.
  Parity fixtures prove `graft_dead_symbols` and the `graft_review`
  reference-count path produce deep-equal output through the
  generated-model round-trip. Public behavior is unchanged.

### Changed

- **Release security floor**: release packaging now resolves Vite and Hono to
  patched versions required by the release security gate.
- **Graft-managed workspace registry hardening**: workspace observation now
  serializes first-time installation ID creation, fails closed when managed
  storage cannot be made private, rejects symlinked or unsafe registry storage
  records before reading them, quarantines unsupported registry metadata instead
  of reusing it, rejects malformed installation IDs, recovers stale first-time
  installation locks, caps remote collection during daemon authorization, strips
  userinfo from scp-like and malformed URL-style remote URLs, preserves spaces
  in daemon-collected remote paths, serializes concurrent first workspace
  observation, and only lets observations without explicit repository evidence
  reuse unknown incarnations that have no durable cache or history attachments.
  Strong same-path replacement evidence now quarantines the prior incarnation
  directory before advancing the workspace pointer.
- **Workspace-store contract taxonomy**: Slice 0 conformance failure codes are
  now all included in the frozen `errorTaxonomy`, and the contract test rejects
  covered conformance rows whose failure codes are absent from that taxonomy.

## [0.9.0] - 2026-06-10

### Added

- **Fake Echo-shaped TypeScript witness**: Graft proves its Echo-facing seam
  before any real Echo runtime exists. The canonical schema gains its first
  Intent (`recordGitWarpImportBatch`), Wesley 0.0.5 emits LE-binary var
  codecs (`src/generated/graft-structural-history.codec.generated.ts`), and
  a new app-safe stack — `EchoKernelTransport` byte seam, EINT v1 +
  canonical-CBOR envelope codec, typed structural-history client, and an
  Echo-backed `StructuralReadingPort` adapter mapping Echo's
  `ContractObstructionKind` taxonomy into Graft freshness/residual posture —
  is exercised end to end by a deterministic fake transport. The fake
  mirrors Echo's wire-level authority enforcement (`FORBIDDEN_CONTROL_INTENT`
  for the reserved control op id), and guard tests keep the Echo adapter out
  of production contexts. No public surface changes.
- **Structural-history Echo package descriptor**: Graft now carries a
  deterministic descriptor for the structural-history package it expects Echo
  to host later, with repo-root-relative schema and generated-artifact
  identities, descriptor-only Echo posture, and a local drift check wired into
  `pnpm schema:structural-history:check`.
- **Structural history schema authority**: Graft now carries a canonical
  `schemas/graft-structural-history.graphql` schema with Wesley-generated
  TypeScript contracts and a deterministic artifact drift check, establishing
  the schema-first Echo migration boundary without changing Echo or Wesley.
- **Structural source span invariants**: The canonical structural-history schema
  now rejects source spans whose end offsets or present end lines precede their
  starts.
- **Opened workspace paths**: MCP sessions can now call `workspace_open` to
  open another git worktree path, activate it by default, and inspect opened
  paths through `workspace_list_opened` without adding per-tool `cwd` routing.
- **Symbol history locations**: `graft_blame` and `graft symbol history`
  now carry per-version path and available line-range facts from WARP symbol
  timelines without adding a second `code_show` history response shape.

### Changed

- **Structural history generation gate**: `pnpm schema:structural-history:check`
  now requires a configured Wesley CLI, verifies the pinned CLI version and L1
  registry hash, regenerates the TypeScript artifact from GraphQL, and
  byte-compares it with the committed generated file. CI and release workflows
  install Wesley from a pinned release commit before running the check, and
  `pnpm release:check` includes the same gate.
- **Structural reading boundary**: `graft_review` impact counts and
  `graft_dead_symbols` now read through a Graft-owned
  `StructuralReadingPort` with explicit `echo-native`,
  `git-warp-imported`, and `fallback-translated` evidence labels, preserving
  existing public response shapes while preventing current git-warp readings
  from masquerading as Echo-native witnesshood.

### Fixed

- **Structural reading residual posture**: Reference-count readings now
  report a partial residual posture when committed import-scan fallback
  evidence is unavailable after a zero-count WARP graph reading.

### Security

- **Dependency audit posture**: Patched audited transitive dependencies through
  pnpm overrides for `brace-expansion` and `qs`, preserving a clean release
  security gate.

## [0.8.0] - 2026-05-13

### Added

- **Top-level structural review CLI**: `graft review --base <ref>
  [--head <ref>]` now renders a human-readable structural review summary
  from the existing `graft_review` model, while `--json` keeps the
  schema-validated `graft.cli.struct_review` payload for agents.
- **Structural test coverage map**: `graft_test_coverage` and
  `graft struct test-coverage [--src <path>] [--tests <path>]` now
  report exported source symbols with or without bounded test-directory
  references, explicitly labeled as structural/reference coverage rather
  than execution coverage.
- **Git enhance provenance hints**: `git graft enhance --since <ref>`
  now adds a bounded provenance-hints section for changed symbols using
  WARP-backed blame facts when available, including ambiguity,
  creation/signature-change commits, reference count, and unavailable
  blame reasons.
- **Symbol history timeline**: `graft symbol history <symbol>
  [--path <path>]` now renders a timeline-first human view over the
  existing provenance-backed `graft_blame` facts while preserving the
  `graft.cli.symbol_blame` JSON schema.
- **Dead symbol detection**: `graft_dead_symbols` and `graft struct
  dead-symbols [--limit <n>]` now list symbols removed from indexed WARP
  history and not subsequently re-added.
- **Review cooldown status helper**: `graft review cooldown [--pr
  <number>]` now reads PR comments via `gh pr view --json comments`,
  detects CodeRabbit rate-limit markers, and reports local ready,
  cooldown, or unknown status; `--comments-file` supports fixture-backed
  checks.
- **Rust structural parsing**: parser-backed outlines, governed reads,
  structural diffs, and WARP indexing now recognize `.rs` files using
  the bundled Rust tree-sitter grammar.
- **GraphQL structural parsing**: parser-backed outlines, governed
  reads, structural diffs, and WARP indexing now recognize `.graphql`,
  `.gql`, and `.graphqls` files using a compatible GraphQL
  tree-sitter WASM grammar with GraphQL-specific outline kinds for
  objects, fields, inputs, scalars, unions, directives, operations,
  fragments, schema declarations, and enum values, with fixture coverage
  for Continuum/Wesley-style contract schemas.
- **Python structural parsing**: parser-backed outlines, governed reads,
  structural diffs, and WARP indexing now recognize `.py` and `.pyi`
  files using the bundled Python tree-sitter grammar. Outlines cover
  functions, async functions, classes, public methods, class fields, and
  uppercase module constants.
- **Go structural parsing**: parser-backed outlines, governed reads,
  structural diffs, and WARP indexing now recognize `.go` files using
  the bundled Go tree-sitter grammar. Outlines cover packages,
  functions, receiver methods, structs, interfaces, constants, and
  variables.
- **JSON structured config projection**: parser-backed outlines,
  governed reads, structural diffs, and WARP indexing now recognize
  `.json` files using the bundled JSON tree-sitter grammar. Outlines
  summarize top-level config keys with bounded nested object children.
- **TOML structured config projection**: parser-backed outlines,
  governed reads, structural diffs, and WARP indexing now recognize
  `.toml` files using the bundled TOML tree-sitter grammar. Outlines
  summarize tables, array tables, and bounded package/tool fields.
- **YAML structured config projection**: parser-backed outlines,
  governed reads, structural diffs, and WARP indexing now recognize
  `.yaml` and `.yml` files using the bundled YAML tree-sitter grammar.
  Outlines summarize top-level keys and bounded nested mapping anchors.
- **Docker auto-start helper**: the isolated test runner now attempts to
  launch Docker Desktop on macOS before failing the Docker daemon
  preflight, while keeping the existing explicit fallback guidance for
  unsupported or failed startup paths.
- **Bounded WARP semantic enrichment seam**: `indexHead` accepts an
  optional semantic enrichment provider for explicit-path indexing,
  emits same-file `calls` edges and `typeof` symbol properties from
  accepted provider facts, caps per-file semantic facts, and reports
  unavailable providers without breaking tree-sitter indexing.
- **Git version startup guard**: CLI, stdio MCP, and daemon startup now
  fail early when the installed Git is below the plumbing baseline
  needed for flags such as `--path-format`. Hosts can also call
  `ensureGitVersionSupportsGraft(...)` from the root package export.
- **Method glossary**: `docs/method/GLOSSARY.md` defines core project
  terms including WARP, causal provenance, strand, worldline, checkout
  epoch, and workspace overlay.

### Changed

- **Lazy parser runtime**: Tree-sitter and grammar WASM loading now
  happens through an explicit `ensureParserReady()` path instead of
  top-level await, reducing cold-start pressure for runtimes that do
  not parse immediately.
- **MCP orchestration staging**: MCP invocation and server construction
  are split into named stages and factories, preserving tool behavior
  while reducing orchestration debt.
- **Unified governed read logic**: MCP `safe_read` delegates cache and
  structural-diff decisions to `RepoWorkspace.safeRead`, keeping the
  MCP and direct library surfaces aligned.
- **WARP symbol identity hardening**: symbol-id encoding and decoding
  now route through `SymIdCodec`, and `indexHead` uses a lighter patch
  payload estimator instead of serializing full patch JSON for budget
  checks.

### Fixed

- **Structural test coverage review fix**: `graft struct
  test-coverage` now skips tracked test files deleted from the working
  tree before running reference searches, so unstaged or staged test
  deletions degrade to uncovered symbols instead of failing on missing
  paths.
- **Review truth follow-up**: CodeRabbit cooldown detection now ignores
  unauthored rate-limit text by default, structural test coverage batches
  symbol reference searches per run, CLI render schemas use strict object
  definitions directly, and review-facing model/render tests cover empty
  history plus provenance-hint output.
- **Review truth collision follow-up**: CodeRabbit cooldown detection now
  returns unknown when any authored rate-limit marker lacks timestamp or
  duration evidence, and structural test coverage avoids substring
  matches while attributing duplicate exported symbol names to the
  referenced source file.
- **Structural review PR feedback**: `graft review` and
  `graft struct review` now require `--base` at parse time, nested
  object-literal defaults no longer compact into malformed signatures,
  and Rust impl/trait extraction uses the grammar's `body` field
  without a dead fallback.
- **PR review hardening follow-up**: Docker auto-start polling no longer
  uses `Atomics.wait` on the main thread, Docker probe subprocesses are
  bounded, parser warmup fire-and-forget paths consume rejected promises,
  `SymIdCodec` rejects malformed IDs and escapes delimiter characters,
  WARP structural path filters are directory-boundary safe, the MCP server
  passes injected Git clients through `ToolContext`, and playback tests avoid
  Node 21-only `import.meta.dirname`.
- **Release gate stability**: the Docker-isolated test runner now bounds
  default Vitest worker concurrency unless an explicit `--maxWorkers`
  argument is supplied, keeping full-suite release validation stable under
  constrained Docker resources.
- **Parser readiness follow-up**: root library hosts can now call
  `ensureParserReady()` before synchronous structured-buffer use, while
  pre-warm sync projection bundles return explicit partial parser
  unavailable results instead of throwing. Outline cache writes are
  best-effort after successful governed reads, lazy outline snapshots
  share in-flight work, and WARP indexing reuses the parsed tree for
  outline extraction.
- **Projection bundle README example**: direct `StructuredBuffer` usage
  now shows explicit disposal, while `createProjectionBundle(...)` is
  documented as the lifecycle-owning wrapper.

## [0.7.1] - 2026-04-30

### Fixed

- **npm package runtime shape**: The published package now ships built
  `dist/` output without `src/`, keeps `tsx` as development-only
  tooling, runs the package bin and generated Claude hook commands from
  compiled JavaScript, migrates generated v0.7.0 Claude hook commands
  through `graft init --write-claude-hooks`, declares
  targeted `sideEffects` metadata for parser initialization, pins the
  patched `postcss` transitive used by Vite, and guards manual publishes
  with `prepublishOnly`.

## [0.7.0] - 2026-04-30

### Added

- **Sludge detector**: `doctor` can run an opt-in parser-backed
  structural smell scan with `sludge: true` or `graft doctor --sludge`.
  It reports typedef/class imbalance, JSDoc cast density, homeless
  constructor functions, free functions operating on project types, and
  high-symbol-count files.
- **Refactor difficulty score**: `graft_difficulty` and
  `graft symbol difficulty` report a scalar per-symbol refactor score
  from WARP churn curvature and reference-edge friction.
- **WARP snapshot indexing**: `indexHead` is now the canonical
  snapshot-based indexing path and emits commit, file, directory,
  symbol, and AST facts with tick metadata.
- **Cross-file import resolution**: WARP now records import,
  re-export, and namespace reference edges for graph-native reference
  queries.
- **Outline-diff commit trailer**: `formatStructuralDiffTrailer` +
  `parseStructuralDiffTrailer` for embedding structural diffs in
  git commit messages as machine-readable trailers.
- **Background indexing with monitor_nudge**: `monitor_nudge` MCP
  tool triggers immediate re-index for a running monitor. For
  post-commit hooks to notify graft that HEAD changed.
- **Structural drift detection**: `checkNumericClaim` and
  `checkPatternProhibition` verify doc claims against reality —
  numeric counts and pattern prohibitions.
- **Drift sentinel**: `runDriftSentinel(ctx, options)` scans all
  tracked markdown files for stale symbol references against the
  WARP graph. Returns pass/fail verdict for pre-commit hook use.
- **WARP-based reference counting for structural-review**: `graft_review`
  now counts symbol references via WARP graph traversal instead of
  ripgrep. More precise (actual imports) and faster (no subprocess).
- **Stale docs checker**: `checkStaleDocs` cross-references markdown
  symbol mentions against the WARP graph to detect outdated docs.
  `checkVersionDrift` compares CHANGELOG vs package.json versions.
- **Session knowledge map**: `knowledge_map` MCP tool answers "what
  do I already know?" — observed files, symbols, staleness flags,
  and per-directory coverage.
- **Symbol history timeline**: `symbolTimeline(ctx, name, filePath?)`
  returns every version of a symbol across commits — signature, line
  range, presence, and change kind, ordered by tick.
- **Dead symbol detection**: `findDeadSymbols(ctx, options?)` finds
  symbols removed from the codebase and never re-added. Supports
  `maxCommits` depth limiting. Uses WARP snapshot diffs, no grep.
- **Monitor tick ceiling tracking**: `runMonitorTickJob` skips
  `openWarp` and `indexHead` when HEAD hasn't changed since the last
  indexed commit. Idle monitor ticks are now near-zero-cost.
- **Daemon-backed stdio MCP runtime**: `graft serve --runtime daemon`
  exposes the tested daemon bridge as a release-facing MCP runtime, and
  `graft init --mcp-runtime daemon --write-*-mcp` can generate client
  config for daemon-backed stdio instead of repo-local stdio.
- **Read-only daemon status surface**: `graft daemon status
  [--socket <path>]` renders daemon health, session counts, workspace
  posture, monitor summary, scheduler pressure, and worker pressure
  without adding daemon mutation actions.
- **Git-facing enhance first slice**: `git graft enhance --since <ref>`
  and `git-graft enhance --since <ref>` compose shipped structural
  since and export-surface facts into a concise review summary, with
  schema-validated JSON available through `--json`.
- **Governed exact replacement edit**: `graft_edit` is a narrow MCP
  edit tool for one exact replacement through Graft's path, policy,
  schema, and filesystem-port boundaries.
- **Agent drift advisory**: `graft_edit` responses can include optional
  advisory `driftWarnings` when a same-session edit removes then later
  reintroduces the narrow `jsdoc_typedef` structural pattern.

### Changed

- **WARP context boundary**: `WarpHandle` was removed in favor of
  direct git-warp types carried through `WarpContext`, with fail-closed
  strand routing hooks for future strand isolation.
- **Structural query read paths**: structural queries now use
  `traverse`, `QueryBuilder`, and tick receipts instead of broad
  `getEdges()` scans.
- **WARP-backed structural operations**: `graft_log`, `graft_churn`,
  `graft_blame`, and `graft_review` now use WARP graph data for their
  MCP execution paths.
- **Aggregate-backed structural churn**: `graft_churn` now computes
  live-symbol change counts with WARP `QueryBuilder.aggregate()`, while
  preserving removed-symbol churn from tick receipt evidence.
- **`graft_blame` output shape**: WARP-backed blame returns tick-aware
  symbol timeline data and a simplified `createdInCommit` value. This
  is a breaking pre-1.0 MCP schema change for consumers scraping the
  old result shape.
- **Daemon runtime selection**: repo-local `graft serve` remains
  unchanged, while daemon-backed operation is now an explicit
  `--runtime daemon` choice with clear setup docs.
- **Release scope truth**: full LSP semantic enrichment and the
  remaining medium-risk slice-first read sweep are preserved as
  post-v0.7.0 follow-up cards instead of active release blockers.

### Removed

- **Legacy commit-walking indexer**: removed the old `indexCommits`
  pipeline and related model/graph helpers. `indexHead` is the active
  indexing path.

### Fixed

- **Agent worktree hygiene**: added `pnpm guard:agent-worktrees`,
  wired it into release preflight and the repo-local pre-commit hook,
  and covered forced embedded-repo gitlinks under `.claude/worktrees/`.
- **Export surface semver impact**: `exportSurfaceDiff` now treats
  breaking signature changes conservatively. Required parameter
  additions, removed parameters, parameter type changes, and return
  type changes are `major`; additive optional parameters are `minor`.
- **Reference edge scan**: `referencesForSymbol` no longer scans all
  graph edges; it traverses incoming `references` edges from the target
  symbol/file node.
- **Keep a Changelog version drift**: `checkVersionDrift` now accepts
  bracketed headings such as `## [0.7.0] - YYYY-MM-DD`.
- **Dockerized test isolation**: default `pnpm test` now runs in a
  copy-in Docker container so validation cannot inherit the operator's
  live checkout Git hooks or Git environment.
- **Full-suite timeout nondeterminism**: test MCP servers and daemon
  integration tests now use explicit temp-only Git/runtime seams to
  avoid hidden WARP/server work under full-suite load.
- **Repo path symlink-parent escape**: repo path resolution validates
  the nearest existing ancestor so future create/write tools cannot
  escape through an existing symlinked parent directory.
- **Monitor indexing ceiling**: background monitor ticks now batch
  explicit paths through the existing `indexHead` cap instead of
  failing every tick for repos with more than 64 parseable files.
- **WARP structural log metadata**: `indexHead` now persists commit
  message, author, email, date, and timestamp on commit nodes so
  `graft struct log` retains user-visible commit context.
- **Cold WARP structural review impact**: `graft_review` now preserves
  breaking-change impact counts on fresh worktrees by falling back to a
  bounded import/re-export scan when graph reference edges are not
  available yet.
- **Backlog dependency DAG**: the checked-in DAG now renders
  `blocked_by`, `blocking`, and `blocked_by_external` relationships
  from backlog card frontmatter.

## [0.6.1] - 2026-04-19

### Fixed

- **CI test fixes**: release gate test excludes build artifact `dist/`
  from existence check. Package docs test updated for moved doc paths.

## [0.6.0] - 2026-04-18

### Added

- **Runtime port guards**: `assertFileSystem()`, `assertJsonCodec()`,
  and `assertToolContext()` validate adapter contracts at construction
  time. Plumbing conformance test catches drift against
  `@git-stunts/plumbing`.
- **Secret scrubbing**: shared `scrubSecrets()` and
  `sanitizeArgValues()` redact sensitive keys, truncate oversized
  values, and scrub secret patterns across both `run_capture` output
  and observability arg logging.
- **Path escape invariants**: dedicated test suite for traversal
  attacks, symlink escapes, and root-confinement.
- **Worktree identity canonicalization**: `fs.realpathSync` resolves
  path aliases (`/tmp` vs `/private/tmp`) before deriving workspace
  IDs.
- **Tool-call provenance footprints**: `ToolCallFootprint` records
  paths, symbols, and line regions per tool invocation. Read-family
  and search tools instrumented.
- **Canonical symbol identity projection**: `graft_diff` and
  `graft_since` enrich diff entries with `identityId` from WARP
  `sid:*` anchors when indexed. Graceful degradation when unavailable.
- **Dynamic project root**: `GRAFT_PROJECT_ROOT` env var overrides
  the default `process.cwd()` binding. Git root auto-detection
  fallback.
- **Implicit daemon binding**: daemon-mode sessions auto-bind when
  a repo-scoped tool is called with path evidence, removing the
  mandatory `workspace_bind` step.
- **Attribution fallback hardening**: transport session, environment
  inference (CI/CD, editor detection), and session continuity
  strategies reduce `actor:unknown` to the exception path.
- **Anti-sludge policy**: semgrep rules and shell checks for
  boundary discipline, banned patterns, and core-layer hygiene.
- **`toJsonObject()` DTO bridge**: universal serialization boundary
  between typed operation results and `ctx.respond()`.

### Changed

- **Explicit execution context**: `ToolHandler` now receives `ctx`
  as an explicit parameter `(args, ctx)` instead of closing over it
  via `createHandler(ctx)`. `AsyncLocalStorage` removed from
  execution context threading.
- **Session concept disambiguation**: `SessionTracker` renamed to
  `GovernorTracker`, `RegisteredSession` to `RegisteredTransport`,
  `WorkspaceSessionMode` to `WorkspaceMode`. Wire format preserved.
- **MCP composition decomposition**: `server.ts` split into barrel +
  `server-context.ts` + `server-invocation.ts`. `repo-state.ts` into
  4 sub-modules. `daemon-control-plane.ts` into `control-plane/`.
  `daemon-repos.ts` into `repo-overview/`. `daemon-worker-pool.ts`
  into 3 sub-modules. `persistent-monitor-runtime.ts` into 3
  sub-modules. `workspace-router.ts` gains capability and history
  sub-modules.
- **Parser decomposition**: markdown extraction split into
  `src/parser/markdown.ts`. Parser reclassified as application module
  (Layer 3) with enforced hex layer guardrails.
- **Result type hardening**: `MetricsSnapshot`, `MetricsDelta`,
  `DecisionEntry`, `StateSaveResult`, `StateLoadResult` promoted to
  runtime classes. `[key: string]: unknown` index signatures removed
  from all operation results. Receipt builder uses mutable draft
  instead of `as` casts.
- **`code_find` approximate discovery**: plain-text queries now use
  case-insensitive exact/prefix/substring matching with deterministic
  ranking.
- **Claude hook governed reads**: `PreToolUse` now redirects large
  JS/TS native `Read` calls to graft's bounded-read path.
- **Codex bootstrap posture**: `graft init --write-codex-mcp` now
  seeds `AGENTS.md` alongside `.codex/config.toml`.
- **MCP runtime observability**: sessions emit metadata-only events
  to `.graft/logs/mcp-runtime.ndjson`, receipts carry `traceId` and
  `latencyMs`.
- **Map tool collector extraction**: `map.ts` reduced from 328 to
  52 lines; collection logic in `map-collector.ts`.
- **Typed diagnostic responses**: `DoctorResponse`, `StatsResponse`,
  `ExplainResponse`, `SetBudgetResponse`, `RunCaptureResponse`.

### Fixed

- **Worktree identity drift on macOS**: `/tmp` and `/private/tmp`
  aliases no longer produce different workspace IDs.
- **`GRAFT_PROJECT_ROOT` env var**: MCP servers no longer hardcoded
  to their own repo path.
- **Path resolver security**: absolute paths now confined to project
  root. Symlink escapes detected via `fs.realpathSync` double-check.
- **WARP symbol disambiguation**: `symNodeId` uses qualified names
  (`Header.render` vs `Footer.render`) — same-named methods across
  classes no longer collide.
- **WARP indexer error propagation**: `IndexResult` is a discriminated
  union. Git failures propagate instead of producing silently empty
  graphs.
- **Daemon session cleanup**: session directories removed on close
  instead of leaking forever.
- **Rotating log preservation**: oversized entries preserved instead
  of erasing the entire log during rotation.
- **`graft_map` output caps**: `MAX_MAP_FILES=100`, `MAX_MAP_BYTES=50000`
  with automatic summary-only fallback. Budget-exhausted sessions get
  compact `BUDGET_EXHAUSTED` response.
- **hono vulnerability**: override to >=4.12.14 patches HTML
  injection in `hono/jsx` SSR (Dependabot alert #10).

## [0.5.0] - 2026-04-11

### Added

- **Between-commit activity view**: new bounded `activity_view` MCP
  tool and `graft diag activity` CLI peer surface for inspecting
  recent local `artifact_history` around the active causal workspace.
- **Persisted local history substrate**: continuity, attribution,
  staged-target, transition, and recent read/stage activity now
  survive across local sessions as bounded artifact history.
- **Same-repo concurrency posture**: bounded `repoConcurrency`
  summaries and lawful same-worktree cross-session handoff semantics.

### Changed

- **Reactive workspace footing**: checkout-boundary footing, hook
  posture, and forked-vs-stable lineage are now explicit product truth
  instead of implied inference.
- **Semantic transitions**: bounded surfaces now summarize
  `index_update`, `conflict_resolution`, `merge_phase`,
  `rebase_phase`, `bulk_transition`, and lawful `unknown` with
  transition-aware guidance.
- **Signpost docs**: README, GUIDE, BEARING, VISION, release notes,
  and the new CLI/MCP/advanced signposts now reflect the 0.5.0
  release cut.

## [0.4.0] - 2026-04-05

### Added

- **WARP Level 1 — structural memory substrate**: git-warp-backed
  graph stores structural facts per commit. Directory tree, file,
  symbol, and commit nodes with containment edges and provenance
  links (touches, adds, changes, removes).
- **`graft_since`**: structural changes since a git ref — symbols
  added, removed, and changed per file with summary lines. Instant.
- **`graft_map`**: structural map of a directory — all files and
  their symbols in one call via tree-sitter.
- **`graft index` CLI**: manual WARP indexing trigger.
- **WARP indexer**: walks git history, parses files with tree-sitter,
  emits WARP patches. Handles nested symbols, file deletion,
  signature changes, unsupported language degradation.
- **Observer factory**: 8 canonical lens patterns for focused graph
  projections (file symbols, all symbols, directory files, etc.).
- **11 WARP invariants**: observer-only-access, materialization-
  deterministic, delta-only-storage, address-not-identity, and more.
- **`@git-stunts/git-warp` v16** + `@git-stunts/plumbing` deps.

## [0.3.5] - 2026-04-05

### Fixed

- **CI**: use `npx npm@latest` for OIDC trusted publishing — avoids
  self-upgrade breakage on Node 22's bundled npm.

## [0.3.4] - 2026-04-05

### Fixed

- **CI**: upgrade npm CLI to >=11.5.1 for OIDC trusted publishing.

## [0.3.3] - 2026-04-05

### Fixed

- **CI**: use `npm publish` instead of `pnpm publish` for OIDC
  provenance.

## [0.3.2] - 2026-04-05

### Added

- **`graft init`**: zero-friction project onboarding. Scaffolds
  `.graftignore`, adds `.graft/` to `.gitignore`, generates
  `CLAUDE.md` snippet instructing agents to prefer graft tools,
  and prints Claude Code hook config. Idempotent.
- **CI**: release workflow attaches npm tarball + SHA256SUMS to
  GitHub releases as downloadable assets.
- **CI**: npm publish via OIDC provenance (no secret needed).

### Changed

- **CLI bootstrap**: `bin/graft.js` resolves tsx from the package's
  own `node_modules`, so `graft init` works from any directory.
- **Docs**: regenerated README, GUIDE, BEARING, and VISION signposts.
- **package.json**: added `publishConfig`, `homepage`, `bugs`,
  `packageManager`, upgraded keywords for MCP/agent discovery.

### Fixed

- **CI**: removed pnpm version override that conflicted with
  `packageManager` field.

## [0.3.1] - 2026-04-05

### Changed

- **CI**: release workflow now publishes to npm via OIDC provenance.
- **Docs**: regenerated README, GUIDE, BEARING, and VISION signposts
  to reflect v0.3.0 features (12 tools, budget governor, reason codes).

## [0.3.0] - 2026-04-05

### Added

- **Budget-aware governor**: `set_budget(bytes)` declares a session
  byte budget. Thresholds tighten as budget drains — no single read
  may consume more than 5% of remaining budget. New `BUDGET_CAP`
  reason code. Budget info in receipts.
- **Explain tool**: `explain(code)` returns human-readable meaning and
  recommended action for any reason code.
- **Policy check middleware**: tools with `policyCheck: true` get
  automatic `evaluatePolicy` before the handler runs. Applied to
  `read_range`.
- **CachedFile value object**: immutable file snapshot bundles content,
  hash, outline, jump table, and actual metrics from a single read.
  Eliminates TOCTOU snapshot races by construction.
- **guardedPort() factory**: Proxy-based stream boundary guard wraps
  all methods on a port interface. One line to guard a whole port.
- **Receipt compression ratio**: `compressionRatio` field in receipts
  (returnedBytes / fileBytes). Instant context efficiency signal.
- **Diff summary lines**: each file in `graft_diff` output includes a
  one-line structural stat for quick triage.

### Fixed

- **Strict MCP argument validation**: Zod schemas now reject unknown
  keys at the MCP edge instead of silently stripping them.
- **run_capture log-write isolation**: filesystem failures when
  persisting capture logs no longer mask successful command output.
- **Cache-hit policy re-check**: `safe_read` now re-evaluates policy
  on cache hits, preventing stale cached data from bypassing refusals.

## [0.2.2] - 2026-04-04

### Added

- **Docker support**: run graft as an MCP server without installing
  Node. `docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft`.
  Node 22 Alpine, non-root user.
- **Canonical JSON codec**: all JSON serialization uses deterministic
  sorted keys and compact output via `CanonicalJsonCodec`. Enables
  stable hashes and diffable logs. `JsonCodec` port for hexagonal
  compliance.

### Fixed

- **JSON serialization safety**: codec preserves `Date` and custom
  `toJSON` semantics, detects circular references, handles shared
  object references without false cycle detection.

## [0.2.1] - 2026-04-04

### Added

- **Value objects** (cycle 0016): OutlineEntry, JumpEntry, DiffEntry,
  OutlineDiff, and Tripwire converted from plain interfaces to frozen
  SSJS classes with constructor validation and private `_brand` fields.
  Completes SSJS P1 migration for all domain types.
- **PostToolUse hook for Read**: educates agents on context cost after
  large file reads, showing what safe_read would have returned and the
  savings in KB.
- **Shared hook utilities** (`src/hooks/shared.ts`): validated input
  parsing, stdin reader with 1 MB size guard, safe relative path
  resolution, and `runHook` harness with full stack trace logging.
- **18 project invariants** documented in `docs/invariants/`.

### Fixed

- **Trim-and-validate**: value object constructors trim names before
  validation, preventing whitespace-only strings from passing as valid.
- **Input validation**: hooks now validate JSON structure at runtime
  instead of using unsafe `as` type assertions.
- **Path traversal guard**: hooks reject file paths outside the project
  `cwd` (passes through to native Read instead of evaluating policy on
  arbitrary paths).
- **UTF-8 safety**: stdin reader accumulates raw buffers before decoding
  to prevent multi-byte character corruption at chunk boundaries.
- **Stack traces**: hook error handler logs `err.stack` instead of
  `err.message` for debuggability.
- **Node engine**: bump minimum to `>=20.11.0` for `import.meta.dirname`
  support (used across test suite and eslint config).

## [0.2.0] - 2026-04-03

### Changed

- **Server decomposition** (cycle 0010): split 541-line MCP server
  god file into focused modules. `server.ts` is now 110 lines of pure
  registration and plumbing. New modules:
  - `metrics.ts` — `Metrics` class replaces 6 loose counters
  - `cache.ts` — `Observation` class + `ObservationCache` with
    `isStale()`, `touch()`, `record()`, `check()`, `get()`
  - `receipt.ts` — `buildReceiptResult()` with stabilization loop
  - `context.ts` — `ToolContext` interface + `ToolHandler` type
  - `tools/*.ts` — 9 files, one per tool handler (state.ts has both
    save + load)
- **FileSystem port** (cycle 0011): hexagonal compliance — core logic
  no longer imports `node:fs` directly. New `FileSystem` interface in
  `src/ports/filesystem.ts` with Node adapter in `src/adapters/node-fs.ts`.
  All operations and metrics use the port; testable with mock filesystems.
- **Outline quality audit** (cycle 0012): 7 real-world fixture files,
  40 test assertions proving outline extraction works on React
  components, Express routers, barrel files, god classes, dense
  generics, and decorated classes.

### Added

- **Arrow function export extraction**: `export const fn = () => {}`
  now gets `kind: "function"` with parameter/return type signature
  instead of generic `kind: "export"`.
- **Enum extraction**: `enum` declarations appear in outlines with
  `kind: "enum"`.
- **Re-export extraction**: named, type, and wildcard re-exports
  now appear in outlines. Barrel files are no longer invisible.
- **Claude Code hooks** (cycle 0015): PreToolUse hook blocks banned
  files (secrets, binaries, lockfiles, `.graftignore` matches).
  PostToolUse hook educates agents on context cost after large file
  reads, suggesting `safe_read` as an alternative.

### Fixed

- **Byte metrics**: receipt builder now uses `Buffer.byteLength()`
  instead of `text.length` for returnedBytes and cumulative byte
  accounting. Was counting UTF-16 code units as bytes.
- **Path traversal guard**: all path-accepting tools now use
  `ctx.resolvePath()` which rejects relative paths that escape the
  project root via `..` segments.
- **Doctor thresholds drift**: doctor tool now imports
  `STATIC_THRESHOLDS` from policy instead of hardcoding values.
- **run_capture tail validation**: clamp tail to minimum 1 to prevent
  zero/negative values from producing undefined behavior.
- **safe_read result.actual guard**: check `result.actual !== undefined`
  before using it for cache recording (actual is optional on error
  projections).

## [0.1.0] - 2026-04-03

### Added

- **Policy engine**: dual thresholds (150 lines + 12 KB), 5 ban
  categories (binary, lockfile, minified, build output, secret),
  `.graftignore` support, session-depth dynamic caps (20/10/4 KB).
- **Parser**: tree-sitter WASM outline extraction for JS/TS with
  jump tables, signature bounding, and broken-file recovery.
- **Session tracker**: 4 tripwires (SESSION_LONG, EDIT_BASH_LOOP,
  RUNAWAY_TOOLS, LATE_LARGE_READ) with session depth reporting.
- **Metrics logger**: NDJSON decision logging with retention/rotation.
- **Operations**: safe_read, file_outline, read_range, state_save/load.
- **MCP server**: all 8 Phase 1 commands as MCP tools over stdio,
  session tracking (tripwires + dynamic caps automatic), doctor and
  stats tools. Entry point at `src/mcp/stdio.ts`.
- **Re-read suppression**: session-level observation cache — second
  read of an unchanged file returns cached outline instead of
  re-reading. Tracks readCount, estimatedBytesAvoided, lastReadAt.
  Works for both safe_read and file_outline. Stats includes
  totalCacheHits and totalBytesAvoidedByCache.
- **Receipt mode**: every MCP response includes a `_receipt` block
  with sessionId, monotonic seq, projection, reason, fileBytes,
  returnedBytes, and cumulative counters (reads, outlines, refusals,
  cacheHits, bytesReturned, bytesAvoided). Blacklight can grep API
  transcripts to prove graft works.
- **Changed-since-last-read**: when a file changes between reads,
  graft returns a structural diff (added/removed/changed symbols)
  alongside the new outline. New `changed_since` MCP tool for
  explicit delta queries without triggering a full safe_read.
- Now 16 machine-stable reason codes — added `REREAD_UNCHANGED`
  (cycle 0003) and `CHANGED_SINCE_LAST_READ` (cycle 0005).
- **Structural git diff** (`graft_diff`): symbol-level diff between
  any two git refs. Uses `git rev-parse --verify` + `git cat-file -e`
  for stable ref/object detection.
- **run_capture implemented**: tee shell output to log file, return
  last N lines. Full output at `.graft/logs/capture.log`.
- **MCP tool descriptions**: all 10 tools have agent-facing
  descriptions in their schema for discovery via `listTools`.
- **bin/graft.js**: CLI entry point for `npx @flyingrobots/graft`.
- 16 machine-stable reason codes.
- 227 tests across 20 test files.
- 7 cycles completed, 3 legends (CORE, WARP, CLEAN_CODE).

### Fixed

- **Diff path policy check**: both `safe_read` and `changed_since`
  now run `evaluatePolicy` before returning structural data,
  preventing leaks if policy rules change after initial observation.
  Note: `safe_read` always evaluates policy; `changed_since` was
  added in this release and now also evaluates policy.
- **Nested symbol diff**: classes/interfaces now recursively diff
  children. A method added inside a class shows as a changed class
  with a childDiff detailing the nested change.
- **Snapshot race**: diff and changed_since paths now use
  extractOutline with the already-read content instead of
  re-reading the file via fileOutline.
- **Pre-push hook**: parses stdin for the remote ref being pushed to
  instead of checking the local branch name.
- **oldSignature consistency**: DiffEntry.oldSignature now uses the
  same entrySignature fallback (name when no signature) as the
  comparison logic.
- **Stale lastReadAt**: diff responses now return the updated
  timestamp from the observation cache instead of the old one.
- **Dead DiffEntry fields**: removed unused start/end from DiffEntry.
- Add `@types/node` and `@types/picomatch` (required by TypeScript 6).
- Fix session-depth table in design doc ("Messages Remaining" →
  "Messages Elapsed").
