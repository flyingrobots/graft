---
title: "ClaimWarp"
legend: "CORE"
cycle: "CORE_claims-source-files"
source_backlog: "docs/design/CORE_claims-source-files.md (non-goal: ClaimWarp is the next step)"
---

# ClaimWarp

Legend: CORE

A claim term is a tree. Stored as JSON, its child order is array order and its
structure is invisible to anything that cannot parse the term. ClaimWarp stores
the same tree as a typed WARP subgraph, so the graph itself carries the
structure (Contextual Claims 2 §3.2, §4, §22.1).

## Hill

`encodeClaimTerm` writes a term into a graph, `assertValidClaimWarp` checks a
subgraph is a well-formed term, and `decodeClaimWarp` reads it back. For every
term, `JSON.stringify(decode(encode(t))) === JSON.stringify(t)`.

## Shape

- One graph node per term node, id `claim:<termId>:<canonical path>`, with
  properties `claimWarp` (the version, `claim-warp/1`), `termId`, `path`,
  `kind`, `keys` (the node's own key order) and `f:<key>` for each non-child
  field, kept verbatim as JSON.
- One `claim_child` edge per parent-child link, with `role` (`body`,
  `guarded`, `condition`, `even_if`, `still`, `items`, `options`) and
  `ordinal` as edge properties. A guard's body has role `guarded`, matching
  its canonical path.
- Validation refuses an unknown constructor, a missing or extra child, a gap
  in ordinals, a node reached twice, and a recorded path that disagrees with
  the node's position, naming the node.

## Backend boundary

The codec depends on two ports, `ClaimGraphWriter` (git-warp's
`PatchBuilderV2` satisfies it) and `ClaimGraphReader`. `claim-warp-git.ts` is
the only file where ClaimWarp meets git-warp, so an Echo WARP backend replaces
that file and nothing else.

## Acceptance criteria

- Byte-identical round trip for every constructor, nested terms, and a term
  whose keys are in an unusual order, through an in-memory graph and through
  committed git-warp patches reopened from disk.
- Child order is carried by `role` and `ordinal` edge properties.
- Malformed subgraphs are refused with the node named.

## Non-goals

- Occurrences, extraction attempts, relations and decisions as an outer graph
  (ClaimWorld). That is the next step.
- Canonical term bytes and digests (the package specification, §8).
- Support or evidence queries: the global index stays administrative.

## Test strategy

- `test/unit/claims/claim-warp.test.ts` over invented fixtures.
- A local-only round trip over a real corpus is run outside this repository;
  its results are recorded with that corpus, not here.
