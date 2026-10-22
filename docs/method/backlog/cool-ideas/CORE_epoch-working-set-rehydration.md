---
title: "Rehydrate the hot working set when a context epoch advances"
feature: session
kind: trunk
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "CORE_unchanged-outline-notice (consumer delivery ledger and context epochs)"
---

# Rehydrate the hot working set when a context epoch advances

User idea, 2026-10-09: when compaction or clear advances a consumer's epoch,
Graft could proactively hand back the consumer's "hottest" observations.

MCP cannot push content into the model's context unprompted, but the client's
post-compaction hook can inject extra context (for example Claude Code
`SessionStart` with source `compact`). That hook could ask Graft for the
consumer's working set from the previous epoch.

## Variants, cheapest first

1. **Names only.** "Before compaction you held outlines of these N files;
   they are no longer assumed present." This costs almost nothing and tells
   the model what to re-request.
2. **Jump tables for the top-K files** ranked by recency and frequency of
   `read_range` follow-ups.
3. **Full outlines for the top-K.** This risks undoing the token savings that
   compaction just produced.

## Open questions

- Does injected context survive the client's own summary, or is it duplicated
  by it?
- How should "hot" be ranked: recency, ack count, or follow-up reads?
- The budget has to be measured: start with variant 1 and an A/B on re-request
  rate before trying anything larger.
