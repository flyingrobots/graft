---
title: "Backlog DAG reports unresolved internal dependency refs"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/67
---

# Backlog DAG reports unresolved internal dependency refs

## Problem

The backlog dependency DAG generator reports unresolved internal dependency
references as normal console output. Current known examples include cards blocked
by `CLEAN_CODE_export-diff-semver-signature-as-patch`, which no longer resolves
to an active backlog card.

## Risk

Planning-truth warnings become ambient noise. If unresolved dependency refs are
allowed to remain in the generated DAG output, future real dependency breakage
will be easier to miss.

## Desired Outcome

The active backlog graph has no unresolved internal dependency refs unless they
are explicitly allowlisted with a reason and expiry.

## Acceptance Criteria

- The two known unresolved refs are repaired or explicitly allowlisted.
- DAG generation output distinguishes expected external blockers from broken
  internal references.
- A focused regression prevents accidental unresolved internal dependency refs.
