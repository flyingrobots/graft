---
title: "A4b: reference counts state their terms"
feature: core
kind: feature
legend: CORE
lane: up-next
priority: 1
effort: M
requirements:
  - "A reference count states its unit: distinct other files that reference the symbol"
  - "A reference count states its domain, coverage and actual basis"
  - "Fallback answers never claim a basis they did not answer at"
acceptance_criteria:
  - "graft_blame and graft_difficulty report a posture with their reference counts, and report partial when the referencing file was never indexed"
  - "A committed-scan count declares its domain and counts files in languages the scan does not resolve as excluded, staying complete"
  - "A fallback count reports the basis it actually answered at, or its limitation, with evidence that it answers at the requested basis before claiming it"
  - "Every changed strict output advertises a new schema version, checked against the validator that version names"
---

# A4b: reference counts state their terms

Roadmap item A4b, added by the 2026-10-21 review of the A1/A3/A4 packet. It is
a separate change from A4 (dead-symbol completeness).

## Hill

A reference count says what it counts, over what, at which revision, and how
much of that it saw. "Zero references" is a claim with a relation definition,
a basis, coverage and unresolved cases behind it, not a bare number.

## Problem

Graft counts references two ways (code reading at `98111ef0`):

- The committed reference scan (`src/warp/committed-reference-scan.ts`),
  behind `StructuralReadingPort`, used by `graft_review`. It reads every file
  at the ref in a qualified-reference language (Python, TypeScript, TSX,
  JavaScript, Rust, Go) and derives `complete` or `partial` from shadowing
  warnings, unsupported or unresolved forms and parse errors. Its domain is
  unstated: a symbol named in YAML, GraphQL or a shell script is not counted.
- Direct WARP graph counts (`src/warp/warp-reference-count.ts`), called by
  `graft_blame` (`src/warp/warp-structural-blame.ts`) and
  `graft_difficulty` (`src/warp/refactor-difficulty.ts`) outside the port.
  The graph is built by the lazy indexer, so a never-indexed referencing file
  contributes nothing, and the outputs are bare `referenceCount` numbers.

## Review rulings

- **Unit**: the count is the number of distinct **other files** that
  reference the symbol. It is not call sites, textual occurrences, or runtime
  callers. State that in the contract and the output.
- **Actual basis**: the pinned adapter reported `freshness: "current"` and
  the requested ref even when it fell back to graph counts. The A4 branch
  fixes the port's fallback reading (`freshness: "incomparable"`,
  `warp-indexed-graph` basis with `requestedRef`). This item must carry the
  same honesty into every consumer: require evidence that a fallback answers
  at the requested basis, or report its actual basis and limitations.
- **Routing**: prefer routing `graft_blame` and `graft_difficulty` through the
  existing port, so there is one reference-count path with one set of terms.
- **Prerequisites**: do not draw `A4 -> A4b` by default. Routing through the
  committed scan does not need A4's index-coverage implementation. Add the
  edge only if the chosen design reuses `src/warp/index-coverage.ts`.
- **Sequencing**: land this before A5 finalizes the shared vocabulary
  (`CORE_shared-answer-terms.md`), so A5 generalizes from two demonstrated
  shapes.

## Witnesses

- Graph path: a repository where the only referencing file is not indexed.
  `graft_blame` reports `partial`; on `main` it reports a bare count.
- Scan path: a repository with a YAML file naming the symbol. The answer
  counts YAML as excluded and stays `complete`.
- Fallback: a scan failure at a non-HEAD ref. The answer does not claim that
  ref.

## Non-goals

- Counting call sites or runtime callers.
- The shared terms block (A5).
