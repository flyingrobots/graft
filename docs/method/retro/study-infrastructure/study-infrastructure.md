---
title: "Cycle 0020 — Study Infrastructure"
---

# Cycle 0020 — Study Infrastructure

**Hill:** Build the infrastructure to run the live effectiveness study.

**Outcome:** Hill met.

## What shipped

- 10 task cards (T01–T10) across 5 matched pairs and 4 categories
- Acceptance harness (bash, runs automated criteria from YAML cards)
- Randomization generator (seeded PRNG, category-balanced blocked assignment)
- Randomization schedule (frozen artifact)
- Calibration notes, prompt frame, analysis stub
- Design doc

## Playback

- Agent: task cards parseable by acceptance harness? **Yes** — smoke-tested, all criteria extracted and executed.
- Human: study ready to run? **Yes** — infrastructure is complete, pending participant scheduling.

## Drift

None. Scope held to infrastructure only — no study execution.

## CodeRabbit review

3 rounds, 20 comments total. Key fixes:
- AWK criteria extraction pattern was self-terminating (P1)
- Category-balanced randomization replaced raw coin flips (P1)
- Deterministic timestamp for reproducible artifacts
- Python dependency replaced with Node
- Task card acceptance criteria hardened (T01, T02, T03, T04, T09, T10)
- Full 40-char commit SHAs in all task cards
- isStale() corrected to Observation entity scope (T10)

## Lessons

- CodeRabbit rate limiting creates a painful review loop. The stale-check
  workaround (empty commit) works but adds noise. Documented as a
  cool-idea for a proper fix.
