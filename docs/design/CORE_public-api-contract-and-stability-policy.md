---
title: "public api contract and stability policy"
legend: "CORE"
cycle: "CORE_public-api-contract-and-stability-policy"
source_backlog: "docs/method/backlog/up-next/CORE_public-api-contract-and-stability-policy.md"
---

# public api contract and stability policy

Source backlog item: `docs/method/backlog/up-next/CORE_public-api-contract-and-stability-policy.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Define one explicit public API contract for `@flyingrobots/graft` so an
integrator can answer three questions from repo truth without guessing:

- which module path is semver-public
- which root exports are direct typed surfaces versus bridge/host
  surfaces
- how release review classifies additive versus breaking API changes

## Playback Questions

### Human

- [ ] Can an integrator point to one repo-truth document that says the
      only semver-public module path is `@flyingrobots/graft`, and that
      deep imports into `src/` or `dist/` are not public contract?
- [ ] Does that same contract distinguish direct typed integration
      surfaces from bridge/host surfaces instead of treating every root
      export as one undifferentiated bucket?

### Agent

- [ ] Do package metadata, release doctrine, and README links all agree
      on the public API posture instead of leaving the root export
      contract implied?
- [ ] Can release review classify public API additions and breaking
      changes as SemVer-relevant facts before another API expansion
      lands?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: one short public API
  contract doc with grouped export families and an explicit non-goals
  section for unsupported import styles.
- Non-visual or alternate-reading expectations: the contract must be
  readable as plain markdown with no table-only dependency for the core
  rule.

## Localization and Directionality

- Locale / wording / formatting assumptions: plain English package and
  SemVer terminology; code identifiers stay literal.
- Logical direction / layout assumptions: left-to-right prose and code
  examples only.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the public module
  path, supported export families, and release classification rules.
- What must be attributable, evidenced, or governed: any claim about API
  stability must be backed by package metadata, invariant docs, release
  doctrine, and playback witness.

## Non-goals

- [ ] Expanding the public API beyond the current root package surface.
- [ ] Promising post-1.0 stability semantics while the package remains
      `0.x`.
- [ ] Introducing subpath exports or blessing deep imports into
      implementation directories.

## Backlog Context

The direct package surface is now real product posture. Define what is public, what is bridge-only, what is direct typed surface, and how release review decides whether a change is a breaking API change versus an internal refactor.
