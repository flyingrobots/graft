---
title: "Observation cache identifies content with a 32-bit FNV-1a hash"
feature: session
kind: bad-code
legend: CORE
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-10-09
---

# Observation cache identifies content with a 32-bit FNV-1a hash

## Problem

`hashContent` in `src/operations/observation-cache.ts` is 32-bit FNV-1a, and
it decides whether a reread of a path is "unchanged". A collision makes
`safe_read` return `REREAD_UNCHANGED`, or `file_outline` serve a stale
outline, for bytes that changed. Collisions are rare for a single path, but
nothing bounds that probability, and suppression turns a collision into silent
staleness rather than a wasted parse.

## Direction

Use SHA-256, which the delivery ledger uses already, or compare the full bytes
on a hash match. Cost is negligible next to tree-sitter parsing.
