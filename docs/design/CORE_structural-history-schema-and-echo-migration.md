---
title: "Structural history schema and Echo migration"
legend: "CORE"
cycle: "CORE_structural-history-schema-and-echo-migration"
source_backlog: "docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md"
---

# Structural history schema and Echo migration

Source backlog item: `docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or specific agent
instance.

## Hill

Graft's structural history becomes schema-first under Wesley and Echo-backed by
default, while git-warp is demoted to a provenance-preserving migration source
and optional compatibility bridge.

This cycle is not "swap storage adapters." It is the architectural correction
that makes Graft's structural semantics explicit before any substrate migration
can fossilize git-warp's model.

## Laws

1. Graft owns structural semantics.
2. Wesley owns the compiler and generated-contract rules; Graft only supplies
   schema and integration config.
3. Echo owns causal-history storage and execution; Graft does not change Echo.
4. git-warp owns only legacy import and compatibility.
5. No git-warp-native concept becomes canonical by accident.

## Playback Questions

### Human

- [ ] Can a human point to one GraphQL schema as the canonical definition of
      Graft structural history?
- [ ] Can a human see that public Graft commands keep their behavior while the
      substrate changes underneath?
- [ ] Can a human distinguish Echo-native, git-warp-imported, and
      fallback-translated evidence in the design and tests?
- [ ] Can a human see when git-warp is no longer opened during normal
      operation?
- [ ] Can a human verify that git-warp remains a provenance-preserving legacy
      source instead of a hidden authority?
- [ ] Can a human verify that the cycle does not require Echo or Wesley repo
      changes?

### Agent

- [ ] Does GraphQL define canonical Graft structural facts?
- [ ] Does Graft use the existing Wesley toolchain to derive TypeScript read
      models, validators, and Echo-consumable contracts from that single source
      of truth?
- [ ] Do drift tests fail when generated artifacts or runtime contracts stop
      matching the GraphQL schema?
- [ ] Do migration parity tests compare Echo-backed outputs against the current
      git-warp-backed outputs?
- [ ] Do `graft_review`, `graft_dead_symbols`, blame, difficulty, structural
      log, churn, and precision/code lookup consume normalized Graft structural
      payloads rather than substrate-specific facts?
- [ ] Does normal operation stop opening git-warp after parity is proven?

## Decision

The dangerous wrong path is:

```text
git-warp graph model
  -> hand-translated Echo model
  -> Graft keeps depending on old concepts
```

That keeps git-warp in authority while moving bytes somewhere faster.

The correct path is:

```text
Graft GraphQL structural history schema
  -> existing Wesley compiler outputs for TypeScript / Zod / Echo / SQL
  -> Echo-backed primary structural history
  -> git-warp one-time import and fallback compatibility
```

Schema authority comes first. Echo is a fast causal-history substrate. Wesley is
the existing compiler that prevents drift across TypeScript, validators, SQL,
Echo-consumable contract artifacts, and other generated outputs. Graft owns the
structural facts being modeled.

This design does not require modifying Echo or Wesley. If the existing Wesley
compiler or Echo contract surface cannot support the schema, that is an
upstream blocker to record separately rather than work to fold into this Graft
cycle.

## Canonical Model Boundary

The GraphQL schema should name Graft-owned structural facts, not git-warp's
internal implementation shape.

Canonical Graft facts include:

- repository, worktree, basis, and observed ref identity
- file identity and file versions
- parser runs and parser diagnostics
- symbols, declarations, exports, imports, references, calls, and source spans
- structural diffs and changed regions
- review impacts and test-reference links
- dead-symbol findings, blame/symbol-history findings, difficulty inputs, log
  entries, and churn summaries when they are structural facts
- structural readings, residual posture, freshness, payload identity, evidence
  labels, and provenance
- migration batches, imported source identity, parity results, and retirement
  decisions

git-warp implementation details must not become canonical merely because the
legacy adapter exposes them:

- observer cache layout
- traversal mechanics
- lazy indexing mechanics
- tick implementation details
- optimization artifacts
- private graph node names that do not describe Graft semantics

## Evidence Model

The migration needs at least these evidence statuses:

```ts
type StructuralHistoryEvidence =
  | EchoNativeEvidence
  | GitWarpImportedEvidence
  | FallbackTranslatedEvidence;

type EchoNativeEvidence = {
  kind: "echo-native";
  schema: GraftStructuralHistorySchemaId;
  basis: EchoStructuralBasis;
};

type GitWarpImportedEvidence = {
  kind: "git-warp-imported";
  schema: GraftStructuralHistorySchemaId;
  importedFrom: GitWarpImportBasis;
  migrationBatch: MigrationBatchId;
  parity: MigrationParityStatus;
};

type FallbackTranslatedEvidence = {
  kind: "fallback-translated";
  substrate: "git-warp";
  basis: GitWarpCommittedBasis;
  nativeContinuumWitness: false;
};
```

The evidence labels are about Graft's structural history source. They do not
authorize Continuum witness claims. The earlier rule still stands:

```text
Continuum-shaped, not Continuum-native.
```

Only Continuum-producing runtimes may claim Continuum-native witnesshood. Graft
may normalize structural readings into Continuum-compatible shape.

## Migration Flow

The migration should be explicit and auditable:

1. Create the Graft-owned GraphQL schema boundary and local Wesley invocation.
2. Make Echo the primary write/read substrate for new structural facts.
3. Import current git-warp structural data into the canonical schema with
   `git-warp-imported` evidence.
4. Compare Echo-backed outputs against current git-warp-backed outputs for
   existing public behavior.
5. Keep a git-warp fallback adapter only for gaps, labeled
   `fallback-translated`.
6. Remove git-warp from normal operation once parity is proven.
7. Retain git-warp compatibility as a deliberate migration/debug path, not as a
   hidden authority.

Parity should cover the public surfaces users already rely on:

- `graft_review` and `struct_review`
- `graft_dead_symbols`
- symbol history and blame
- refactor difficulty
- structural log and churn
- precision/code lookup paths when they expose structural facts

## Wesley Contract

The GraphQL file is the single source of truth. Wesley-generated outputs are
derived artifacts:

- TypeScript read model
- Zod or equivalent runtime validators
- Echo-consumable contract artifacts produced by the existing Wesley toolchain
- SQL/storage artifacts where needed
- schema identity, generation manifest, and drift witness

The repo must not allow parallel models to diverge:

- no hand-maintained TypeScript model that silently differs from GraphQL
- no hand-maintained Zod schema that silently differs from TypeScript
- no hand-maintained Echo model that silently differs from GraphQL
- no migration importer that smuggles git-warp-only concepts into the canonical
  schema
- no Graft branch that changes Wesley just to make a Graft-local schema concept
  work

## Echo Boundary

Echo is deliberately dumb from Graft's perspective. Graft should not change Echo
to understand Graft semantics manually.

Graft declares structural history in GraphQL. The existing Wesley toolchain
compiles the Echo-consumable contracts. Echo stores and executes causal history
through those generated contracts. Graft consumes normalized structural payloads
through its own ports.

That keeps substrate performance and semantic authority separate.

## git-warp Boundary

git-warp remains important during the migration:

- current committed-history evidence source
- one-time import source for existing structural history
- fallback compatibility adapter while parity gaps are closed
- provenance source for explaining imported facts

git-warp must stop being the default authority for normal Graft operation after
parity is proven. No new Graft schema concept should exist solely because a
git-warp graph detail happened to exist first.

## StructuralReadingPort Role

`StructuralReadingPort` remains the Graft-facing structural read boundary, but
the current hand-authored payloads are transitional. The port should move toward
Wesley-generated payloads and evidence labels as the schema lands.

The intended flow becomes:

```text
API / CLI / MCP use case
  -> StructuralReadingPort
  -> Wesley-generated Graft read model
  -> Echo-backed primary store
  -> normalized structural reading payload
```

The fallback flow is explicit:

```text
API / CLI / MCP use case
  -> StructuralReadingPort
  -> git-warp compatibility adapter
  -> fallback-translated evidence
  -> normalized structural reading payload
```

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: The schema, generated artifact
  manifest, and evidence labels must let a reader tell which model is
  authoritative without reconstructing repository history.
- Non-visual or alternate-reading expectations: The migration plan must remain
  understandable as plain text and plain source. Diagrams may help, but they
  must not be required to know whether a fact is Echo-native,
  git-warp-imported, or fallback-translated.

## Localization and Directionality

- Locale / wording / formatting assumptions: Stable evidence labels such as
  `echo-native`, `git-warp-imported`, and `fallback-translated` carry contract
  meaning and should not depend on English prose.
- Logical direction / layout assumptions: The migration direction is schema
  authority first, then generated contracts, then Echo primary operation, then
  git-warp compatibility retirement.

## Non-goals

- Do not hand-port git-warp's graph model into Echo.
- Do not change Echo to understand Graft semantics manually.
- Do not change Wesley to understand Graft semantics manually.
- Do not model git-warp internals as canonical Graft facts.
- Do not change public command behavior during the migration unless a later
  packet explicitly authorizes a surface change.
- Do not remove git-warp support before import parity and fallback behavior are
  proven.
- Do not keep parallel hand-maintained TypeScript, Zod, SQL, and
  Echo-consumable contract models once Wesley generation exists.
- Do not claim Continuum-native witnesshood for imported or translated
  git-warp evidence.

## Expected Test Strategy

The implementation phase should add deterministic tests in this order:

1. Schema drift tests proving generated artifacts match the GraphQL source.
2. Structural reading tests proving public payload behavior remains stable.
3. Evidence-label tests proving Echo-native, git-warp-imported, and
   fallback-translated facts cannot be confused.
4. Migration parity fixtures comparing imported Echo-backed outputs against
   current git-warp-backed outputs.
5. Retirement tests proving normal operation does not open git-warp after
   parity is marked complete.

Tests must assert observable behavior. They should not depend on wall-clock
timing, unseeded randomness, stdout/stderr text, or source-code introspection as
proof.

## Implementation Status

- `schemas/graft-structural-history.graphql` is the first Graft-owned canonical
  structural history schema.
- `src/generated/graft-structural-history.ts` is generated by the existing
  Wesley CLI TypeScript emitter from that schema.
- `schemas/graft-structural-history.manifest.json` records the schema source
  hash, Wesley L1 registry hash, generated artifact hash, required structural
  types, required read operations, and required evidence labels.
- `scripts/check-structural-history-schema-artifacts.ts` and
  `test/unit/contracts/graft-structural-history-schema.test.ts` provide the
  first deterministic drift check for the schema/generated artifact pair.
- This slice does not wire Echo runtime reads yet. It establishes schema
  authority first so later Echo import and parity work has a canonical Graft
  model to target.
