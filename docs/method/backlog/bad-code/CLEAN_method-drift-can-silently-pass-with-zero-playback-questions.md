---
title: "Method drift can silently pass with zero playback questions"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-07-17
---

# Method drift can silently pass with zero playback questions

## Problem

Method's drift check reported a clean result for the active agent-working-set
cycle while also reporting that it scanned zero playback questions. The design
uses `## Playback questions`, but the extractor recognizes only the exact
case-sensitive heading `## Playback Questions`. Graft's `.method.json` also
points the drift scan at `tests/`, while most campaign evidence lives under
`test/unit/` and `test/integration/`.

## Risk

A cycle can receive a green-looking drift result without comparing its actual
playback obligations with most of its executable evidence. Operators may then
mistake absence of extracted input for proof of alignment.

## Desired Outcome

Drift validation fails closed or reports an explicit degraded result when an
active design yields zero playback questions, and Graft's configured evidence
roots cover its real test layout.

## Acceptance Criteria

- An active design with zero extracted playback questions cannot produce an
  unqualified clean result.
- Heading recognition is either deliberately normalized or enforced by a
  design-packet validator with an actionable error.
- Graft's Method configuration scans `tests/`, `test/unit/`, and
  `test/integration/`, or supports an equivalent complete root configuration.
- Regression fixtures cover heading-case drift and a test suite split across
  all configured roots.
- Retro witnesses record the number of questions and test descriptions that
  actually participated in drift analysis.
