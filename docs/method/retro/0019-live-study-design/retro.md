# Cycle 0019 — Live Study Design

**Legend**: CORE
**Branch**: cycle/0019-live-study-design
**Status**: complete

## Goal

A study protocol that a skeptic would accept. Pre-registered
hypotheses, paired design, automated data collection, explicit
failure modes.

## What shipped

`docs/study/protocol.md` (v4.0) — complete study protocol:

- One primary endpoint (retrieval burden per randomized attempt,
  unconditional) + guardrail (task success non-inferiority, Δ=-15pp)
- Matched-pair crossover design with counterbalancing
- Participant definition, eligibility, training rules
- Tool classification table (retrieval, discovery, mutation, etc.)
- 5 matched task pairs with frozen YAML schema
- Holdout tasks and negative controls
- Blocked randomization stratified by category
- Bootstrap CI non-inferiority for guardrail
- Mixed-effects sensitivity analyses
- Pre-registered exclusions, deviations, stopping rules
- Pilot promotion criteria (8 gates)
- Shadow dry run before pilot
- Freeze gate (4 checkboxes, 3/4 checked)
- 4 appendices: enforcement matrix, estimands, calibration
  notes, lab handoff checklist
- Hostile reviewer appendix (§13)

Design doc: `docs/design/0019-live-study-design/design.md`

## Architecture evolution

4 rounds of review:
1. v1.0 — 5 co-equal metrics, same-task-twice design, no
   exclusion rules, vague task bank
2. v2.0 — single primary + guardrail, matched pairs, baseline
   lock, pilot gates, hostile reviewer section
3. v3.0 — M1 unconditional, participant defined, task bank
   contradiction fixed, M4/M5 descriptive only, enforcement
   matrix, estimand appendix
4. v4.0 — §8.1 land mine removed, McNemar replaced with
   bootstrap paired rate difference, placeholders pinned,
   randomization procedure, freeze gate

## Decisions

1. **Unconditional M1** — burden per attempt, not per success.
   Conditioning on success creates survivor bias.
2. **Bootstrap CI for guardrail** — McNemar doesn't fit the
   multi-level design. Paired rate difference with bootstrap
   percentile method is cleaner.
3. **M4 is descriptive** — requires human annotation for
   ambiguous cases. Explicitly disclosed as not fully automated.
4. **One secondary inferential test (M3)** — no Holm correction
   needed for a single test. M4/M5 are operational.
5. **Blocked randomization** — stratified by task category,
   PRNG seeded, schedule pre-generated and committed.

## Metrics

- 4 commits across 4 review rounds
- 1 protocol document (~800 lines)
- 1 design doc
- 0 code (design cycle)
