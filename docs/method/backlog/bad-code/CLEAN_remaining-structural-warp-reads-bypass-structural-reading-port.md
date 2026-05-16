---
title: "Remaining structural WARP reads bypass StructuralReadingPort"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-05-15
---

# Remaining structural WARP reads bypass StructuralReadingPort

## Problem

The first Continuum-shaped structural reading port slice routes
`graft_review` reference-impact counts and `graft_dead_symbols` through
`StructuralReadingPort`, but other structural WARP-backed surfaces still call
WARP helpers directly from tool or WARP-specific modules.

Known remaining paths include:

- `graft_blame` / symbol history
- `graft_difficulty`
- structural log and churn tools
- precision/code lookup paths that expose indexed WARP facts

That is acceptable for the first port slice, but it means the long-term rule is
not fully true yet: Graft does not have every structural read behind a single
Continuum-shaped evidence boundary.

The deeper correction is now schema-first, not port-extension-first. Graft must
define canonical structural history facts in GraphQL, Wesley must generate the
contracts, and Echo must become the primary substrate. The remaining direct
WARP reads should move behind that generated structural model instead of
teaching the hand-authored transitional port to mirror git-warp's shape.

## Risk

If these paths remain as direct WARP reads, future Echo or Continuum-native
adapter work can drift surface by surface. That makes it easier to accidentally
treat Continuum-shaped compatibility data as native witness evidence.

There is a second risk: a quick Echo migration could hand-translate the
git-warp graph model into Echo and leave Graft depending on git-warp-native
concepts as if they were canonical. That would make the migration faster in the
short term and structurally wrong in the long term.

## Desired Outcome

Move the remaining structural WARP-backed surfaces behind the schema-first
structural reading boundary:

1. GraphQL defines canonical Graft structural facts.
2. Wesley generates the read model, validators, and Echo-facing contracts.
3. Echo becomes the default structural history substrate.
4. Existing git-warp facts are imported as provenance-preserving
   `git-warp-imported` evidence or read through temporary
   `fallback-translated` compatibility.
5. Public response schemas stay stable unless a separate design packet
   explicitly changes them.

## Acceptance Criteria

- Symbol history/blame readings carry explicit structural evidence status.
- Refactor difficulty readings carry explicit structural evidence status.
- Structural log/churn readings carry explicit structural evidence status.
- Precision/code lookup paths either consume normalized structural readings or
  are explicitly documented as non-structural WARP utilities.
- No git-warp committed-history evidence is modeled as a Continuum witness.
- No git-warp-native concept becomes canonical in the Graft GraphQL schema by
  accident.
- Normal Graft operation no longer opens git-warp after Echo import parity is
  proven.
