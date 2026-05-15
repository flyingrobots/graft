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

## Risk

If these paths remain as direct WARP reads, future Echo or Continuum-native
adapter work can drift surface by surface. That makes it easier to accidentally
treat Continuum-shaped compatibility data as native witness evidence.

## Desired Outcome

Move the remaining structural WARP-backed surfaces behind
`StructuralReadingPort` in follow-up slices, preserving public response schemas
unless a separate design packet explicitly changes them.

## Acceptance Criteria

- Symbol history/blame readings carry explicit structural evidence status.
- Refactor difficulty readings carry explicit structural evidence status.
- Structural log/churn readings carry explicit structural evidence status.
- Precision/code lookup paths either consume normalized structural readings or
  are explicitly documented as non-structural WARP utilities.
- No git-warp committed-history evidence is modeled as a Continuum witness.
