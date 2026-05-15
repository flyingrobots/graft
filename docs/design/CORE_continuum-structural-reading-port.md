---
title: "Continuum-shaped structural reading port"
legend: "CORE"
cycle: "CORE_continuum-structural-reading-port"
source_backlog: "docs/method/backlog/up-next/CORE_continuum-structural-reading-port.md"
---

# Continuum-shaped structural reading port

Source backlog item: `docs/method/backlog/up-next/CORE_continuum-structural-reading-port.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or specific agent
instance.

## Hill

By the end of this cycle, Graft has one explicit structural reading boundary:
`StructuralReadingPort`.

The port accepts Continuum-shaped boundary concepts, but it does not require
every backing substrate to publish native Continuum artifacts. Existing
git-warp committed-history reads must sit behind this port and be marked as
translated, non-Continuum-native evidence. Future Echo or other
Continuum-producing runtimes may enter through the same boundary as
Continuum-native evidence only when they provide real Continuum witness
artifacts.

The phrase to preserve is:

> Continuum-shaped, not Continuum-native.

## Playback Questions

### Human

- [ ] Can a human point to one Graft-owned structural read boundary instead of
      finding direct git-warp reads scattered through MCP tools and renderers?
- [ ] Can a human tell whether a reading is Continuum-native or merely
      translated into a Continuum-compatible shape?
- [ ] Does the design prevent git-warp commit/range evidence from being
      misrepresented as a Continuum witness?
- [ ] Can a future Echo-backed implementation plug in without changing the
      public review, dead-symbol, or structural rendering contracts?

### Agent

- [ ] Does `src/ports/structural-reading.ts` define the only Graft-facing
      structural read port and evidence union?
- [ ] Does the git-warp adapter mark every committed-history reading as
      `translated-substrate` with `nativeContinuumWitness: false`?
- [ ] Does at least one deterministic fixture-backed test prove the
      `continuum-native` evidence branch?
- [ ] Do `graft_review` and `graft_dead_symbols` consume normalized Graft
      structural payloads instead of calling substrate-specific facts directly?
- [ ] Do public API, CLI, MCP, and renderer outputs remain compatible unless a
      later design packet explicitly changes their schemas?

## Doctrine

Graft may normalize readings into Continuum-compatible shape. Only
Continuum-producing runtimes may claim Continuum-native witnesshood.

The port must model evidentiary status as data, not prose:

```ts
type StructuralReadingEvidence =
  | ContinuumNativeEvidence
  | TranslatedSubstrateEvidence;

type ContinuumNativeEvidence = {
  kind: "continuum-native";
  envelope: ReadingEnvelope;
  witness?: WitnessedSuffixShell;
};

type TranslatedSubstrateEvidence = {
  kind: "translated-substrate";
  substrate: "git-warp";
  basis: GitWarpCommittedBasis;
  evidence: GitWarpEvidence;
  nativeContinuumWitness: false;
};
```

The `nativeContinuumWitness: false` marker is deliberately ugly. It makes fraud
hard at the type boundary.

## Boundary Shape

The first Graft-owned port should be narrower than a generic graph database and
more explicit than today's direct `WarpContext` helper calls:

- basis identity: committed Git history, live frontier, or imported runtime
  envelope
- observation request identity: the review, symbol, or structural query being
  asked
- reading kind: reference impact, dead symbols, symbol history, structural test
  coverage, or later live-frontier projection
- freshness: current, stale, or incomparable
- residual posture: complete, partial, plural, budget-limited, rights-limited,
  or unavailable
- evidence status: Continuum-native or translated substrate
- typed Graft payload: the structural fact consumed by API, CLI, MCP, or
  renderer code

The implementation should begin with only the payloads needed by the current
slice:

```ts
interface StructuralReadingPort {
  countSymbolReferences(request: SymbolReferenceReadingRequest):
    Promise<StructuralReadingResult<SymbolReferenceReadingPayload>>;
  findDeadSymbols(request: DeadSymbolsReadingRequest):
    Promise<StructuralReadingResult<DeadSymbolsReadingPayload>>;
}
```

Additional methods should be added only as existing surfaces are moved behind
the boundary. The port is not a license to invent a broad, speculative
abstraction.

## Evidence Types

Graft should define local structural DTOs rather than importing Echo,
git-warp, or warp-ttd concrete runtime types through API and MCP surfaces.

The first type family should be:

- `StructuralReadingEvidence`
- `ContinuumNativeEvidence`
- `TranslatedSubstrateEvidence`
- `StructuralReadingResult<TPayload>`
- `StructuralReadingFreshness`
- `StructuralReadingResidualPosture`
- `GitWarpCommittedBasis`
- `GitWarpEvidence`

`ContinuumNativeEvidence` may use local structural references for Continuum
artifacts until generated Continuum contracts are ready in this repository. The
important invariant is that native evidence must carry a Continuum reading
envelope, and translated git-warp evidence must carry `nativeContinuumWitness:
false`.

## First Adapter

The first adapter is a git-warp committed-history adapter:

```text
MCP / CLI / API use case
  -> StructuralReadingPort
  -> git-warp committed-history adapter
  -> translated-substrate evidence
  -> normalized Graft payload
```

It should call existing WARP helpers rather than rewriting structural logic:

- `countSymbolReferencesFromGraph(...)` for review impact counts
- `countNamedImportReferencesAtRef(...)` as the current committed-history
  fallback for review impact counts
- `findDeadSymbols(...)` for dead-symbol readings

The fallback import-reference count is still translated substrate evidence. It
is based on committed repository content at a Git ref, not on a native
Continuum witness.

## First Consumers

Move the smallest set of substrate-specific consumers behind the port:

- `graft_review`: reference impact counts should come from
  `StructuralReadingPort.countSymbolReferences(...)`
- `graft_dead_symbols`: dead-symbol payloads should come from
  `StructuralReadingPort.findDeadSymbols(...)`

The first implementation should preserve the public response bodies for
`graft_review`, `struct_review`, and `graft_dead_symbols`. The normalized
reading and evidence metadata can remain inside the Graft boundary until a
separate API/schema design packet chooses how to expose it.

Renderers must continue to consume the existing public models. They should not
learn git-warp facts directly.

## Continuum-Native Fixture

This slice must include one deterministic unit test proving that the
Continuum-native evidence branch is representable and cannot be confused with
translated git-warp evidence.

Fixture requirements:

- construct a `StructuralReadingResult<T>` with
  `evidence.kind === "continuum-native"`
- include a Continuum-shaped `envelope`
- include a Continuum-shaped `witness`
- assert that translated substrate evidence has
  `nativeContinuumWitness === false`
- avoid wall-clock timing, randomness, stdout/stderr assertions, and code
  introspection as behavioral proof

The fixture may be local and minimal until generated Continuum runtime-boundary
artifacts are consumable from Graft.

## Graft Registry Role

This cycle should preserve Graft's proposed Continuum registry role without
making Graft the semantic owner of shared Continuum families:

| Repo | Registry role | Must not become |
| :--- | :--- | :--- |
| Graft | Structural observer and review engine; consumes runtime-boundary, receipt, settlement, neighborhood, and observer families; produces code-aware structural reading payloads. | A runtime implementation, debugger product, shadow Continuum semantic owner, or permanent host-normalization layer. |

If a Graft structural payload becomes useful to another repo, promote that
family into Continuum through the normal family-promotion process instead of
copying local DTOs across repositories.

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: Evidence status must be visible in
  one structural type instead of explained through scattered comments.
- Non-visual or alternate-reading expectations: The port and fixture tests
  should read as plain source and plain markdown. No diagrams are required to
  understand whether evidence is native or translated.

## Localization and Directionality

- Locale / wording / formatting assumptions: Stable contract labels such as
  `continuum-native`, `translated-substrate`, and `nativeContinuumWitness`
  should not rely on English prose to carry semantics.
- Logical direction / layout assumptions: The adapter direction should remain
  linear: surface code asks Graft for a reading; Graft chooses an adapter; the
  adapter labels its evidence.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: Agents must be able to
  inspect a `StructuralReadingResult` and determine the payload, basis,
  freshness, residual posture, and evidence status without opening an adapter.
- What must be attributable, evidenced, or governed: Tests must prove that
  git-warp readings are translated substrate evidence and that the
  Continuum-native branch is separate.

## Non-goals

- [ ] Replacing git-warp in this cycle.
- [ ] Adding a direct Echo dependency before the port boundary exists.
- [ ] Modeling git-warp commit, range, graph, or import-reference evidence as a
      Continuum witness.
- [ ] Making Graft the semantic owner of Continuum runtime-boundary nouns.
- [ ] Making warp-ttd the structural-review engine.
- [ ] Exposing new evidence metadata through MCP/API/CLI response schemas in
      the first implementation slice.
- [ ] Migrating every WARP read path, including precision, churn, blame, stale
      docs, and local-history graph reads, in one cycle.
- [ ] Solving the slice-first observer-geometry backlog while this port is
      being introduced.

## Expected Artifacts

- `src/ports/structural-reading.ts` with the Graft-owned port, evidence union,
  status types, and payload contracts.
- A git-warp committed-history adapter behind the port.
- `graft_review` routed through the port for symbol reference impact counts.
- `graft_dead_symbols` routed through the port for dead-symbol readings.
- Deterministic unit coverage for translated git-warp evidence and the
  Continuum-native evidence branch.
- Public response compatibility coverage for the touched MCP/CLI surfaces.
- No tag, release, or public schema change as part of this slice.
