---
title: "ClaimWorld"
legend: "CORE"
cycle: "CORE_claims-source-files"
source_backlog: "docs/design/CORE_claim-warp.md (non-goal: ClaimWorld is the next step)"
---

# ClaimWorld

Legend: CORE

ClaimWarp stores one claim term. ClaimWorld is the graph around the terms: who
extracted what from which artifact and when, which relations were proposed
between artifacts, which decisions adjudicated them, and which candidate, if
any, was chosen (Contextual Claims 2 §6, §15.3, §21, §22.3).

## Hill

From the graph alone, answer three questions the JSON files answer today, with
the same answers:

- **as of** a date, which extraction attempts had entered the world;
- **supersession**: which artifact is current for a subject as of a date, and
  by what approved chain, with the same contract as the package's `resolve`;
- **current reading**: the current artifact's extraction attempts as of a date,
  and for each one which candidate is selected, and why.

## Shape

- `artifact:<id>`; `extraction:<path>@<extractedAt>` with an `extracted_from`
  edge to its artifact; `candidate:<…>#<i>` with a `candidate_of` edge
  (ordinal on the edge) and a `has_term` edge to its ClaimWarp root.
- `proposal:<receipt>:<n>` with `from_artifact` / `to_artifact` edges when an
  endpoint begins with an artifact id, and a `keyed_by` edge to
  `proposal-key:<sha256>`. `decision:<receipt>:<n>` has a `decides` edge to the
  same key node, so a decision joins its proposal across ingests.
- `selection:<receipt>:<n>` with a `selects` edge to a candidate.
- `receipt:<id>` per ingest, with a `recorded` edge to everything it wrote.
- Order among proposals and among decisions is (receipt id, position), and the
  last decision on a proposal governs it, as in `resolve`.

## Candidate order is not an adjudication

A candidate is selected only by a recorded selection, effective from its date,
or by a named policy the caller passes (`sole-candidate`: select when there is
exactly one). Otherwise the reading is `unselected` with the candidate count.

## Acceptance criteria

- For every subject and date in the fixture, `resolveInWorld` deep-equals the
  package's `resolve` over the same proposals and decisions, `extractionsAsOf`
  equals a date filter over the documents, and the current reading lists the
  same documents, through an in-memory graph and through git-warp with the
  world split across two ingests.
- No reading selects a candidate by position.

## Where the code lives

The world codec is in `@flyingrobots/contextual-claims` (its specification
§10), with admitted artifact files as node attachments. Graft's
`src/claims/claim-warp-git.ts` writes one ingest and its files as one WARP
patch and reads them back.

## Non-goals

- Support or evidence queries: the global index stays administrative.
- Replacing the JSON as authority. That waits for the shadow lane's evidence.
