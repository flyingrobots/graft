---
title: "Structural history schema and Echo migration"
feature: core
kind: architecture
legend: CORE
lane: up-next
priority: 1
effort: XL
requirements:
  - "Graft owns structural semantics"
  - "Wesley owns generated contracts"
  - "Echo owns causal-history storage and execution"
  - "git-warp remains available as legacy import and compatibility input"
  - "Existing public Graft commands preserve their behavior through migration"
acceptance_criteria:
  - "GraphQL defines canonical Graft structural facts"
  - "Wesley generates the TypeScript read model, validators, and Echo-facing contracts"
  - "Existing public Graft commands keep their behavior"
  - "Evidence labels distinguish Echo-native, git-warp-imported, and fallback-translated facts"
  - "Migration validates parity against current git-warp-backed outputs"
  - "Normal operation no longer opens git-warp after parity is proven"
---

# Structural history schema and Echo migration

## Hill

Graft's structural history becomes schema-first under Wesley and Echo-backed by
default, while git-warp is demoted to a provenance-preserving migration source
and optional compatibility bridge.

This is not a storage-adapter swap. The real decision is that Graft stops
treating git-warp's model as authority and defines its own structural history
schema.

## Laws

1. Graft owns structural semantics.
2. Wesley owns generated contracts.
3. Echo owns causal-history storage and execution.
4. git-warp owns only legacy import and compatibility.
5. No git-warp-native concept becomes canonical by accident.

## Why

Echo is the faster and more scalable causal-history substrate for Graft's long
histories. git-warp remains useful as the current committed-history source, but
Graft should not keep treating git-warp's graph model as the canonical shape of
code history.

The dangerous path is:

```text
git-warp graph model
  -> hand-translated Echo model
  -> Graft keeps depending on old concepts
```

That would preserve adapter-shaped technical debt while pretending to migrate.

The correct path is schema authority first:

```text
Graft GraphQL structural history schema
  -> Wesley-generated contracts
  -> Echo-backed primary structural history
  -> git-warp one-time import and fallback compatibility
```

Both Echo and git-warp can move toward Wesley GraphQL contracts, but Graft's
structural facts must still be named by Graft. Echo is a substrate, not the
semantic owner of code structure.

## Implementation path

1. Define the canonical Graft structural history model in GraphQL.
2. Make Wesley generate the TypeScript read model, Zod validators, Echo-facing
   contracts, and storage artifacts from that single source of truth.
3. Add drift checks that fail if generated artifacts or runtime contracts are
   edited by hand or fall out of sync with the GraphQL schema.
4. Teach Graft's structural reads to consume the generated read model through
   `StructuralReadingPort`.
5. Import current git-warp structural history into Echo as
   `git-warp-imported` evidence with provenance.
6. Keep a fallback git-warp adapter only as `fallback-translated` evidence while
   migration parity is being proven.
7. Validate parity for current public surfaces such as review, dead symbols,
   blame, difficulty, structural log, churn, and precision/code lookup where
   they expose structural facts.
8. Stop opening git-warp during normal Graft operation after parity is proven.

## Evidence labels

Graft's structural reading evidence must make the provenance status explicit:

- `echo-native`: facts written, stored, and read through the Wesley-generated
  Echo-backed structural history model.
- `git-warp-imported`: facts imported once from git-warp into the canonical
  Graft schema with preserved source provenance.
- `fallback-translated`: facts read through git-warp compatibility after the
  schema exists, useful only while parity gaps remain.

These labels are separate from Continuum witnesshood. A fact can be
Continuum-shaped without being a Continuum-native witness.

## Non-goals

- Do not hand-port git-warp's graph model into Echo.
- Do not change Echo to understand Graft semantics manually.
- Do not treat git-warp concepts as canonical because they are convenient.
- Do not change public command behavior during the migration unless a later
  packet explicitly authorizes a surface change.
- Do not delete git-warp support until import parity and fallback behavior are
  proven.
- Do not keep parallel hand-maintained TypeScript, Zod, SQL, and Echo Rust
  models after Wesley generation exists.

## First slice

The first implementation slice should create the schema authority, not the full
runtime migration:

1. Add the initial Graft structural history GraphQL schema.
2. Add or configure Wesley generation for at least the TypeScript/Zod side and
   the Echo-facing contract target expected by the stack.
3. Add deterministic drift tests around generated artifacts.
4. Map the current `StructuralReadingPort` payloads to the generated model
   without changing public command outputs.
5. Document which current git-warp facts will become imported evidence versus
   fallback-translated evidence.

This may feel slower than adapting git-warp output straight into Echo. That
slowness is the guardrail: schema authority must exist before migration so the
migration does not become the architecture.
