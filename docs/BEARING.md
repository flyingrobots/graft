# Bearing: Measurement

**Set:** 2026-04-04
**Direction:** Prove graft works. Ship the data, not just the code.

## Why now

Graft has 18 cycles of engineering — policy engine, outlines,
hooks, value objects, codec port, Docker. The governor works.
But "works" is an assertion, not evidence.

The Blacklight analysis (96.2 GB Read burden, 75.1% reduction)
is a retrospective estimate on historical data. We need
prospective measurement: does graft actually reduce burden in
live sessions without hurting task completion?

Until we have that data, graft is a smart thesis. After, it's
defensible infrastructure.

## What ships under this bearing

1. **Live study design** (ASAP) — 5-metric before/after study
   methodology. Burden dropped, task completion, re-read churn,
   refusal recovery, governor evasion.
2. **Token usage comparison** — receipt-based measurement
   infrastructure. Graft vs ungoverned, per-session.
3. **Non-read burden** — extend measurement beyond file reads.
   Shell output, search results, subagent bloat.
4. **Context budget** — budget-aware governor. Agent declares
   a token budget, thresholds tighten as it drains.

## What does NOT ship under this bearing

- Phase 2 precision tools (new features, not measurement)
- AST-per-commit (WARP, not measurement)
- Any new MCP tools or policy changes

## Success criteria

- A study design doc that a skeptic would accept
- At least 20 paired sessions (graft vs ungoverned)
- Published results with confidence intervals
- Data-driven answer to "should I install graft?"

## Sequence

Study design first. You can't measure what you haven't defined.
Then build the measurement infrastructure (receipt parsing,
Blacklight integration). Then run the study. Context budget is
the first feature informed by the results.
