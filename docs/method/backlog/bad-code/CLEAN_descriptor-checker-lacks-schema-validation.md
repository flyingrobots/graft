---
title: "Descriptor checker lacks schema validation"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/70
---

# Descriptor checker lacks schema validation

## Problem

The structural-history Echo package descriptor checker byte-compares the
checked-in descriptor against deterministic JSON, but parsed descriptor JSON is
cast directly to TypeScript interfaces. Malformed JSON shapes can therefore
produce generic failures rather than precise structural diagnostics.

## Risk

As more descriptor files appear, ad hoc JSON casts and duplicate manifest readers
can spread. That weakens the descriptor boundary from a contract into a convention.

## Desired Outcome

Descriptor files have explicit runtime shape validation with actionable error
messages.

## Acceptance Criteria

- Add a schema, Zod model, or equivalent validator for the Echo package
  descriptor shape.
- Invalid descriptor fixtures report specific field-level diagnostics.
- The deterministic byte-for-byte drift check remains in place.
- Shared validation helpers are used instead of copying one-off JSON readers.
