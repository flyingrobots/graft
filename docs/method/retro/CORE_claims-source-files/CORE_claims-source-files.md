---
title: "claims-source-files"
cycle: "CORE_claims-source-files"
design_doc: "docs/design/CORE_claims-source-files.md"
outcome: hill-met
drift_check: no
---

# claims-source-files Retro

## Summary

A JSON document shaped like a contextual-claims result is recognised by content
and outlined as one: the artifact, each extraction candidate, and every term
node by canonical path, with its constructor, frame and holder, or predicate.
Every node gets a jump-table entry covering its JSON object. Because the JSON
extractor delegates, live symbol search and the structural index see claims
files through the same path as every other JSON file.

The claim model comes from `@flyingrobots/contextual-claims` (`walkTerm`,
`parsePath`, `frameRefOf`, `subjectLabel`). Graft adds only JSON byte locations
and one layout fact: a guard's consequent, addressed `.guarded`, is stored
under `body`.

## Validation

- `test/unit/parser/claims-outline.test.ts`: 6 tests, observed RED before the
  extractor existed (4 failing; the two negative checks held throughout).
- All parser tests pass unchanged (142), including the existing JSON outline
  tests.
- A real 30-annotation claims file outlined as 32 entries and 32 jump entries,
  not partial, each jump covering its node's object (checked by hand, not
  committed: the file is not public data).

## Ship gate

The package is a local `link:` dependency. This branch must not merge or run
in CI until `@flyingrobots/contextual-claims` is published and the dependency
points at a released version. The gate is enforced: with the `link:`
dependency in place, `test/unit/release/echo-independence.test.ts` fails
("declares no dependency resolved from a local path or a git checkout").

## Follow-on debt

- Resolved in the package: `walkTerm` now names the path and the unknown
  constructor when a term is malformed. Graft still catches the error and
  marks the outline partial.
- ClaimWarp (claim terms as typed WARP subgraphs) is the next cycle.
