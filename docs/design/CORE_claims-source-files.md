---
title: "Claims source files"
legend: "CORE"
cycle: "CORE_claims-source-files"
source_backlog: "docs/method/backlog/cool-ideas/CORE_repository-claim-intelligence.md (branch docs/repository-claim-intelligence-backlog)"
---

# Claims source files

Legend: CORE

A contextual-claims result file (`*.claims.json`) is a source file. It holds
claim terms: trees of seven constructors whose nodes are addressed by canonical
paths such as `$.body.items[0]`. Graft already parses JSON. This cycle makes it
recognise a claims document and outline it as what it is, using the
`@flyingrobots/contextual-claims` package for the claim model rather than a
second copy of it.

## Hill

When Graft reads a JSON document shaped like a contextual-claims result, the
outline, the jump table, live symbol search and the structural index all see
its structure: the artifact id, each extraction candidate, and every term node
by its canonical path, with its constructor, its frame and holder, and for an
atom its predicate. `code_find` on an artifact id or a node path locates the
file and the lines.

Graft's index over claims files is administrative. It answers where a claim
lives and what shape it has. It does not answer whether a claim is supported,
asserted, true or current: those are readings taken from an observer's view,
and they belong to the claims package, not to a global index (Contextual
Claims 2 §11.4: "An index is not epistemic authority by default").

## Acceptance criteria

- A document is recognised by content, not by file name: a root object with a
  string `artifact.artifactId` and an array `candidates` whose items carry a
  `term` object. Anything else outlines as plain JSON, unchanged.
- The outline has one root entry named by the artifact id, one child per
  candidate, and beneath each candidate the term's nodes in tree order, named
  by canonical path, with the constructor, the frame kind and source-relative
  holder, or the atom's predicate, in the signature.
- Every term node has a jump-table entry whose line range covers that node's
  JSON object.
- Holder field names come from the package (`HOLDER_FIELDS`); Graft declares no
  claim types of its own.
- No outline signature carries a support, assertion or truth judgment.
- A malformed claims document (a term missing its constructor) still outlines,
  marking the outline partial, and never throws.

## Playback Questions

### Human

- [ ] If I ask for the outline of a claims file, do I see the artifact, its
      candidates and the claim tree by path, and can I jump to any node?
- [ ] Does `code_find` on an artifact id find its claims file?

### Agent

- [ ] Is recognition by content, so a claims document with any file name is
      recognised and a non-claims JSON file is untouched?
- [ ] Does the outline stay free of support or truth judgments?

## Non-goals

- Support, assertion or relation queries. Those are the package's
  `judgeFor` from an observer, not Graft's.
- Writing claim terms into the WARP graph as typed subgraphs (ClaimWarp).
  That is the next cycle.
- Citation pointers inside Markdown (`[claim:A1$.path · direct · high]`).

## Test strategy

- Unit tests over invented claims documents: recognition (positive and
  negative), outline shape and names, jump-table line ranges checked against
  the document text, frame holders taken from `HOLDER_FIELDS`, the malformed
  case, and a check that no signature contains a judgment word.
- The existing JSON extractor tests must pass unchanged.

## Dependency note

`@flyingrobots/contextual-claims` is not published yet. On this branch it is a
local `link:` dependency, so the branch cannot merge or run in CI until the
package is released. That is recorded in the retro as the gate on shipping.
