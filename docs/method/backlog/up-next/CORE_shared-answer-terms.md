---
title: "A5: canonical, versioned answer terms with enforced semantics"
feature: core
kind: architecture
legend: CORE
lane: up-next
priority: 2
effort: L
blocked_by:
  - CORE_reference-counts-state-their-terms
requirements:
  - "Terms are generalized from demonstrated answer contracts (code_refs, dead symbols, reference counts), not designed ahead of them"
  - "Requested scope and evaluated scope stay distinct"
  - "Contradictory values are rejected by executable checks on the generation and admission paths"
acceptance_criteria:
  - "Shared types express basis, domain, evidence coverage, analysis limitations, delivery and evidence origin without collapsing them into one status"
  - "A reading cannot say complete while its evidence coverage reports missing or unknown required inputs, enforced at runtime on generation and admission"
  - "Legacy readings without evidence decode as unknown, never upgraded to complete"
  - "Each changed strict output advertises a new schema version"
---

# A5: canonical, versioned answer terms with enforced semantics

Roadmap item A5, reshaped by the 2026-10-21 review. Builds on A3
(`code_refs` skipped and content denial), A4 (dead-symbol current-tree
coverage and history terms) and A4b (reference-count terms).

## Hill

Every structural answer can state its terms in one canonical, versioned
vocabulary that Graft's tools, the structural-history schema, Wesley codecs
and Echo-stored readings share, and contradictory terms are rejected by code,
not by convention.

## Dimensions

Completeness is more than `skipped == 0 && missing == 0`. A tool can read
every file and fail to resolve dynamic calls, or compute every result and
return the first hundred. The shared types keep these apart:

| Dimension | What it establishes |
| --- | --- |
| Basis | Exact source revision or observed workspace state, plus relevant analysis configuration. |
| Domain | Languages, relation kinds, paths, history interval, and counting unit covered by the claim. |
| Evidence coverage | Which required inputs were examined, missing, unavailable, or unknown. |
| Analysis limitations | Unsupported syntax, unresolved references, parse failures, and other semantic gaps. |
| Delivery | Whether returned results are truncated or paginated, even if analysis completed. |
| Evidence origin | Parser-submitted, imported, or runtime-recorded evidence and what was actually verified. |

Not every response carries every dimension; the shared types let each answer
express the dimensions that apply.

## Rulings that constrain the design

- **Requested versus evaluated scope**: a tool must not silently shrink its
  domain until the answer becomes "complete". Both are stated.
- **Enforcement**: an `@wes_invariant` declaration alone does not establish
  that contradictory values are rejected. Demonstrate executable enforcement
  through the generation path (Wesley output, TypeScript constructors) and
  the admission path (Echo or the port).
- **Unknown stays unknown**: a legacy reading decoded under the new schema
  does not become `complete` because a field is now required.
- **Removed from the earlier proposal**: (1) a secret-dependent "withheld"
  indicator. Content denial is stated as a constant rule, as A3 does with
  `contentDenial`; no per-answer signal may depend on confidential content.
  (2) Additive schema evolution by negotiation. Graft has no negotiation;
  the existing invariant (`docs/invariants/versioned-output-schemas.md`)
  requires a new advertised version for every strict-shape change.
- **Continuum alignment**: read Continuum's actual contract before claiming
  alignment with its evidence posture. A backlog quotation
  (`CORE_align-structural-evidence-with-continuum-evidence-posture.md`) is
  not sufficient to freeze shared vocabulary.
- **Basis kinds**: the generated schema has no basis kind for the lazily
  built WARP graph; A4 maps it to `UNPINNED_COMMITTED` with no ref. A5 should
  decide whether an explicit kind is needed.

## Ideas to evaluate here

- Evidence behind zero: a "zero references" answer carries its relation
  definition, basis, coverage and unresolved cases.

## Non-goals

- Implementing negotiation.
- Changing what any existing answer claims, except to state it.
