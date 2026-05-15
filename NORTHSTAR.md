# NORTHSTAR

Graft is the structural reading layer for codebases moving through witnessed
causal history.

Its job is to answer code questions with evidence:

- what changed structurally
- which symbols, references, tests, files, and review claims are implicated
- which basis the answer was read from
- which witness, receipt, shell, or retained artifact supports the answer
- what is stale, partial, plural, budget-limited, rights-limited, obstructed,
  or unavailable

The durable promise is:

```text
Graft turns witnessed causal history into code-aware, machine-readable
structural readings.
```

## The Bet

Agentic software work will not be governed by bigger context windows or larger
file dumps. It needs lawful readings: bounded, reproducible, basis-aware
answers that explain enough code structure for the next action without
pretending to expose a god's-eye repository state.

Graft exists because code agents need more than text access:

- They need policy-governed reads that refuse or degrade unsafe material.
- They need structural maps instead of raw-file flooding.
- They need review evidence that names support instead of vibes.
- They need symbol and reference continuity across commits, worktrees, and live
  editor frontiers.
- They need machine-readable outputs that can be consumed without scraping
  prose.
- They need honest residuals when the system cannot see, cannot afford, or
  cannot lawfully reveal the full answer.

The repository is not just a bag of files. It is a moving causal medium:
commits, working tree overlays, agent reads, staged transitions, test evidence,
review claims, editor buffers, speculative lanes, and runtime receipts.

Graft's north star is to make that medium legible for code.

## Stack Position

Continuum's rule is Graft's rule too:

```text
There is no privileged graph.
There is witnessed causal history, and graph-like structure is an
observer-relative reading over that history.
```

Graft must therefore stop treating any one materialized graph, cache, runtime,
or host projection as the primary ontology. The shared boundary is witnessed
causal history plus the Continuum-authored contract families that make that
history admissible, observable, exportable, and importable.

The critical migration distinction is:

```text
Continuum-shaped, not Continuum-native.
```

Graft may normalize structural readings into a Continuum-compatible shape.
Only Continuum-producing runtimes may claim Continuum-native witnesshood.

The stack split is:

| Layer | Owner | Responsibility |
| :--- | :--- | :--- |
| Shared semantics | Continuum | Shared contract families, witness language, admission and compatibility nouns, registry truth. |
| Compilation | Wesley | Generated artifacts, manifests, codecs, bundle identity, TTD surfaces, and witness tooling. |
| Hot runtime | Echo | Low-latency admission, observation, retained readings, receipts, replay, and live/frontier runtime machinery. |
| Cold runtime | `git-warp` | Git-backed, committed-history runtime implementation and durable structural history adapter. |
| Debugger/operator surface | `warp-ttd` | Wide-aperture navigation through lanes, frames, receipts, effects, sessions, delivery observations, and counterfactuals. |
| Structural intelligence | Graft | Code-aware readings, review truth, symbol/reference history, structural test signals, provenance hints, and agent-facing context governance. |

Echo and `git-warp` are sibling Continuum runtime implementations. Neither is
the real graph. Neither is the subordinate half of the other. Runtime posture
can differ: hot, cold, browser-hosted, archival, offline-first, editor-native,
Git-backed. Shared meaning must still cross the Continuum boundary through
authored families and witnessed artifacts.

## What Graft Owns

Graft owns the code-aware observer layer:

- policy-governed reads and explicit refusals
- structural outlines, diffs, and projections
- symbol, reference, rename, and removed-symbol evidence
- structural review summaries and review-readiness signals
- structural test-reference signals
- repository-local provenance hints for agent and human workflows
- Graft-local structural payloads until another repo needs the same semantics
- API, CLI, and MCP surfaces for consuming these readings

Graft's native noun is the structural reading.

A structural reading is not "the graph." It is an observer-relative,
basis-aware code artifact with enough support metadata for a human, agent, API
consumer, CLI caller, MCP client, or debugger view to understand what claim is
being made and what still remains unknown.

## What Graft Must Not Become

Graft must not become:

- a runtime implementation competing with Echo or `git-warp`
- the semantic owner of Continuum shared families
- a hidden graph database API
- a debugger product replacing `warp-ttd`
- a permanent hand-normalization layer for incompatible host stories
- a prose-only review assistant whose claims cannot be inspected
- an agent context firehose

When a structural payload is Graft-specific, Graft may own it locally. When the
same payload becomes shared across repos or runtimes, it should graduate into
Continuum through the normal family promotion path and be compiled by Wesley.

## The Reading Contract

Every serious Graft reading should converge on the same posture, even when the
surface differs between API, CLI, MCP, or debugger display.

A reading should name:

- **basis**: the commit, ref, lane, editor head, runtime coordinate, or witness
  shell it was derived from
- **aperture**: the bounded scope of the question
- **request identity**: the observation question being answered
- **reading kind**: review summary, symbol history, reference map, test signal,
  file outline, diff projection, provenance hint, or other structural payload
- **freshness**: current, stale, incomparable, unknown, or live-frontier
- **residual posture**: complete, partial, plural, budget-limited,
  rights-limited, unavailable, obstructed, or intentionally degraded
- **support**: witness, receipt, shell, retained artifact, provenance payload,
  or explicit absence of support
- **evidence status**: Continuum-native when backed by a native Continuum
  witness, or translated-substrate when adapted from a non-native substrate
- **payload identity**: digest, version, schema, or generated artifact id
- **typed payload**: the actual Graft-owned structural answer

That shape is what lets an agent consume Graft without guessing the basis,
scraping prose, or confusing an observer-side projection with canonical runtime
truth.

## Integration Story

The long-term path is:

```text
Continuum shared family
  -> Wesley-generated artifacts
  -> Echo runtime publication or translated git-warp adapter evidence
  -> ObservationRequest / ObserverPlan
  -> ReadingEnvelope-backed runtime result
  -> Graft structural payload
  -> API / CLI / MCP / warp-ttd presentation
```

In practice:

- `git-warp` remains the right adapter for cold, Git-backed committed history.
  Until it publishes Continuum boundary artifacts directly, its evidence is
  translated substrate evidence, not a Continuum-native witness.
- Echo becomes the right adapter for hot, live, frontier-oriented histories.
- Continuum owns shared runtime-boundary nouns such as `ObserverPlan`,
  `ObservationRequest`, `ReadingEnvelope`, `WitnessedSuffixShell`,
  `CausalSuffixBundle`, and `ImportOutcome`.
- Wesley-generated artifacts replace shadow schemas and hand-normalized DTOs
  where the boundary is shared.
- Graft owns the code-aware structural payload at the edge of the reading.
- `warp-ttd` may display Graft readings as observer artifacts, but should not
  become the long-term owner of code-review meaning.

The key relationship:

```text
warp-ttd explains what happened in the causal runtime.
Graft explains what it means for the code.
```

Those views should meet over witnessed readings, not by forcing the debugger to
learn every Graft-specific code noun or forcing Graft to become a debugger.

## Product Target

Graft should be able to answer, through any official surface:

- What structural fact is true at this basis?
- What changed, and why does that matter for code?
- Which symbols, references, tests, or review claims are implicated?
- Which witness, receipt, shell, or retained artifact supports the claim?
- Is the result current, stale, partial, plural, budget-limited,
  rights-limited, obstructed, or unavailable?
- Can an agent act on the result without reading unrelated files?
- Can a human inspect the same claim without reconstructing hidden state?
- Can `warp-ttd` show the same reading as an artifact of causal observation
  without owning the structural-review engine?

The ideal outcome is not that every caller gets the same bytes. The ideal
outcome is that every caller gets the same truth posture.

## Boundary Laws

1. Graft must not treat any materialized graph as the primary ontology.
2. Graft must keep runtime admission, observation, import, export, and
   settlement concerns behind explicit ports.
3. Graft must not mutate Echo state directly.
4. Graft must not make `warp-ttd` carry permanent host-normalization or
   structural-review debt.
5. Graft must not re-author Continuum-owned shared nouns locally.
6. Graft may own app/tool-local structural payloads until a second repo needs
   the same semantics.
7. Shared structural payloads should graduate to Continuum only when promotion
   reduces drift rather than freezing confusion.
8. API, CLI, MCP, and debugger presentation should expose the same
   structural-reading posture through their own appropriate contracts.
9. Observer-side summaries must not be presented as canonical runtime
   admission unless the runtime actually admitted that collapse and can name
   the corresponding support.
10. Every degraded or refused answer must say why.

## Migration Principle

The near-term move is not "rip out git-warp" or "make Graft call Echo
directly."

The move is:

```text
git-warp-shaped implementation
  -> substrate-neutral structural reading port
  -> git-warp adapter behind the port
  -> translated-substrate evidence with nativeContinuumWitness: false
  -> Continuum-native runtime-boundary fixtures
  -> Echo/live-frontier adapter
  -> generated shared artifacts where the family is no longer Graft-local
```

This keeps the current Review Truth behavior shippable while making the next
architecture honest.

## Near-Term Path

1. Ship `v0.8.0` as the final git-warp-first Review Truth release.
2. Introduce a substrate-neutral structural reading port in Graft.
3. Keep the existing git-warp committed-history implementation behind that
   port and mark its evidence as translated/non-Continuum-native.
4. Add fixture-backed or Echo-backed Continuum runtime-boundary coverage for
   `ObserverPlan`, `ObservationRequest`, `ReadingEnvelope`, and evidence status.
5. Prove one Echo or `jedit` live-frontier structural reading.
6. Shape Graft-owned structural payloads so they can be wrapped in
   `ReadingEnvelope` posture without making Continuum own premature app nouns.
7. Let `warp-ttd` display Graft structural readings as observer artifacts, not
   debugger-native facts.
8. Promote only the structural payloads that truly need cross-repo meaning into
   Continuum.

The first concrete post-`v0.8.0` slice is:

- [CORE_continuum-structural-reading-port](./docs/method/backlog/up-next/CORE_continuum-structural-reading-port.md)

## Success State

We know the north star is becoming real when these things are boring:

- A PR review over committed Git history and a live editor reading over Echo
  both return evidence-bearing structural readings.
- API, CLI, and MCP callers receive the same basis, freshness, residual,
  support, evidence-status, and payload identity posture.
- `warp-ttd` can show a Graft structural reading alongside runtime receipts
  without hand-normalizing host-specific stories.
- Continuum owns the shared families; Wesley generates the artifacts; runtimes
  emit and admit witnessed history; Graft reads code meaning from that history.
- No one has to ask which graph is real.

The answer is always: the graph is a chart. The work is witnessed causal
history. Graft makes the code chart useful.
