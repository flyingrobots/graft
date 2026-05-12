# NORTHSTAR

Graft is a structural intelligence layer for codebases.

Its long-term job is to explain what witnessed causal history means for code:
which symbols changed, which references matter, which tests are implicated,
which review claims are supported, and which structural projections are stale,
partial, budget-limited, rights-limited, or unavailable.

Graft is not the substrate. Graft is not the debugger. Graft is not the shared
semantic authority for the WARP stack.

## Stack Position

The stack split is:

| Layer | Owner | Responsibility |
| :--- | :--- | :--- |
| Shared semantics | Continuum | Shared contract families, witness language, admission and compatibility nouns. |
| Compilation | Wesley | Generated artifacts, manifests, codecs, bundle identity, and witness tooling. |
| Runtime implementations | Echo and `git-warp` | Publishing, admitting, observing, exporting, and importing witnessed causal history. |
| Debugger/operator surface | `warp-ttd` | Navigating lanes, frames, receipts, effects, delivery observations, sessions, and counterfactual investigation. |
| Structural intelligence | Graft | Code-aware structural readings, review truth, symbol history, provenance hints, and agent-facing context governance. |

The shared boundary is not "the graph." The shared boundary is witnessed causal
history and the Continuum-authored contract families that make that history
admissible, observable, exportable, and importable.

## Direction

Graft should move from a `git-warp`-shaped implementation to a
Continuum-shaped structural observer.

The target model is:

```text
Continuum shared family
  -> Wesley-generated artifacts
  -> Echo or git-warp runtime publication
  -> Graft structural observation
  -> ReadingEnvelope-backed structural payload
  -> API / CLI / MCP / warp-ttd presentation
```

In that model:

- `git-warp` remains a valid adapter for cold, Git-backed committed history.
- Echo becomes the right adapter for hot, live, frontier-oriented histories.
- Continuum-owned families define the interoperable boundary.
- Wesley-generated artifacts replace shadow schemas and hand-normalized DTOs.
- `warp-ttd` can display Graft structural readings without becoming Graft.

## Graft's Product Claim

Graft should be able to answer:

- What structural fact is true at this basis?
- Which witness, receipt, or shell supports that claim?
- What did this change mean for code symbols, references, tests, and review?
- Is this projection current, stale, partial, budget-limited, rights-limited, or
  obstructed?
- Can an agent consume the result without scraping prose or guessing the basis?

The durable product promise is:

```text
Graft turns witnessed causal history into code-aware, machine-readable
structural readings.
```

## Boundary Laws

1. Graft must not treat any materialized graph as the primary ontology.
2. Graft must not mutate Echo state directly.
3. Graft must not make `warp-ttd` carry permanent host-normalization debt.
4. Graft must not re-author Continuum-owned shared nouns locally.
5. Graft may own app/tool-local structural payloads until a second repo needs
   the same semantics.
6. Shared structural payloads should graduate to Continuum only when promotion
   reduces drift rather than freezing confusion.
7. API, CLI, and MCP should expose the same structural-reading posture through
   their existing surface contracts.

## Near-Term Path

1. Ship `v0.8.0` as the final git-warp-first Review Truth release.
2. Introduce a substrate-neutral structural reading port in Graft.
3. Keep the existing git-warp implementation behind that port.
4. Add fixture-backed Continuum runtime-boundary coverage for
   `ObserverPlan`, `ObservationRequest`, and `ReadingEnvelope`.
5. Prove one Echo or `jedit` live-frontier structural reading.
6. Let `warp-ttd` display Graft structural readings as observer artifacts,
   not debugger-native facts.

## Non-Goals

- Replacing Echo, `git-warp`, Continuum, Wesley, or `warp-ttd`.
- Making Graft a runtime implementation.
- Making Graft the semantic owner of shared Continuum families.
- Forcing a lockstep release train across stack repos.
- Rewriting the `v0.8.0` release branch into a new substrate architecture.

## First Card

The first concrete post-`v0.8.0` slice is:

- [CORE_continuum-structural-reading-port](./docs/method/backlog/up-next/CORE_continuum-structural-reading-port.md)
