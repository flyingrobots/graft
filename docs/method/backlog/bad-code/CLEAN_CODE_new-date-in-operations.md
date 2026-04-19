---
title: "new Date() wall-clock reads in operations layer"
legend: CLEAN_CODE
lane: bad-code
---

# new Date() wall-clock reads in operations layer

Source: anti-sludge audit 2026-04-19

Three `new Date()` calls in application modules violate the determinism rule:
- `src/operations/repo-workspace.ts:196` — `new Date().toISOString()` for lastReadAt
- `src/operations/observation-cache.ts:67` — `new Date().toISOString()` for lastReadAt
- `src/operations/observation-cache.ts:115` — `new Date().toISOString()` for now

The ClockPort was killed in a prior session but these call sites weren't migrated. Wall-clock reads in core logic break determinism and make tests time-dependent.

Fix direction: inject a `now(): string` function from the caller (adapter layer), or add a minimal clock parameter to the observation cache constructor.

Effort: S
