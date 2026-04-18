---
title: "Cycle 0016 — Value Objects"
---

# Cycle 0016 — Value Objects

**Legend**: CC (clean code)
**Branch**: cycle/0016-value-objects
**Status**: complete

## Goal

Convert parser and session types from plain interfaces to frozen
SSJS value objects with constructor validation. No plain-object
literal can masquerade as an OutlineEntry, JumpEntry, DiffEntry,
OutlineDiff, or Tripwire.

## What shipped

- `OutlineEntry` — frozen class with non-empty trimmed `name`
  validation, recursive `children` freeze. 6 construction sites
  updated in `outline.ts`.
- `JumpEntry` — frozen class with `start >= 1`, `end >= start`
  integer validation. Built via `buildJumpEntry()` in `outline.ts`.
- `DiffEntry` — frozen class with non-empty trimmed `name`
  validation. 4 construction sites updated in `diff.ts`.
- `OutlineDiff` — frozen class with frozen arrays for
  `added`/`removed`/`changed`. 2 sites in `diff.ts`.
- `Tripwire` — frozen class with non-empty `signal` and
  `recommendation` validation. 4 sites in `tracker.ts`.
- Private `_brand` fields on all classes prevent structural forgery.
- Design doc: `docs/design/0016-value-objects/design.md`.
- 40 new tests across 2 test files covering valid construction,
  invalid input rejection, freeze enforcement, and edge cases.

## Architecture evolution

1. **Before**: Parser and session types were TypeScript interfaces.
   Any object literal that matched the shape was accepted — no
   runtime validation, no freeze, no identity.
2. **After**: All five types are frozen classes following the same
   pattern as existing policy types (`PolicyResult`, `Outline`,
   etc.). Constructor validates inputs, `Object.freeze(this)`
   prevents mutation, `_brand` prevents forgery.

This completes the SSJS P1 migration for all domain types in the
project. The `domain-frozen` invariant now covers policy, parser,
and session layers.

## Decisions

1. **Trim-and-validate, not reject-then-trim** — names are trimmed
   before storage, and validation runs on the trimmed value. Found
   via code review: original implementation validated before
   trimming, allowing `" "` to pass as a valid name.
2. **Keep OutlineResult as interface** — it's a container (bag of
   entries + metadata), not a value with identity or invariants.
3. **Keep SessionDepth as string union** — it's an enum, not an
   object. TypeScript's type system already enforces it.
4. **Separate hardening PR** — CodeRabbit caught trim inconsistency
   in DiffEntry. Fixed in a follow-up PR (#12) rather than amending
   the merge commit.

## Metrics

- 7 commits across 2 PRs (#11, #12)
- 5 source files modified, 2 new test files
- 40 new tests (33 value-object, 7 tripwire)
- 347 total tests after merge
- 1 round of CodeRabbit review on PR #11, caught trim bug
