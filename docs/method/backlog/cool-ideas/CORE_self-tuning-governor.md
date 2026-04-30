---
title: "Self-tuning governor"
feature: policy
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Budget governor (shipped)"
  - "NDJSON metrics logging (shipped)"
  - ".graftignore support (shipped)"
  - ".graftrc configuration support (shipped)"
acceptance_criteria:
  - "A `graft tune` command reads the NDJSON metrics log and emits threshold adjustment suggestions"
  - "Suggestions cover: line threshold adjustments, .graftignore additions, session cap tuning, and hot-path detection"
  - "Suggestions include the evidence (e.g., '80% of outlines fire on files between 150-200 lines')"
  - "No automatic changes are made — suggestions are advisory only"
  - "Suggestions are actionable: each includes the specific config change to make"
---

# Self-tuning governor

Analyze the NDJSON metrics log to suggest threshold adjustments.

- If 80% of outlines fire on files between 150-200 lines, suggest
  raising the line threshold.
- If a directory is always refused, suggest adding it to .graftignore.
- If the dynamic session cap never triggers, it might be too generous.
- If a specific file is re-read 50+ times, flag it as a hot path.

Could run as a `graft tune` command that reads the metrics and
emits suggestions, or as a periodic self-check in the MCP server.

## Implementation path

1. Build a metrics log parser that reads NDJSON receipts and aggregates: projection distribution by file size band, refusal frequency by directory, session cap trigger frequency, per-file read counts.
2. Define heuristic rules for each suggestion type:
   - **Threshold adjustment**: If >70% of outline projections fire in a narrow band above the current threshold, suggest raising it.
   - **.graftignore additions**: If a directory has >90% refusal rate across sessions, suggest ignoring it.
   - **Session cap tuning**: If the session cap triggers <5% of the time, suggest lowering it. If >50%, suggest raising it.
   - **Hot-path detection**: If a file is read >20 times across sessions, flag it and suggest caching or pinning strategies.
3. Format output as actionable suggestions with evidence and the exact config change.
4. Wire as a `graft tune` CLI command (not an MCP tool — this is a human-facing analysis command).
5. Keep suggestions advisory only — never auto-apply.

## Related cards

- **CORE_policy-profiles**: Tuning could suggest which built-in profile fits a project, or suggest custom profile adjustments. Complementary but independent — tuning works against the current flat config, profiles add named presets.
- **CORE_lagrangian-policy**: If the policy becomes a multi-axis Lagrangian, tuning would suggest weight adjustments instead of threshold changes. The tuning concept generalizes, but the implementation would differ significantly. Independent builds.
- **CORE_policy-playground**: Playground lets agents preview decisions in real time. Tuning analyzes historical decisions in batch. Different temporal perspectives on the same data. Independent.
- **CORE_graft-as-teacher**: Teacher gives real-time hints during reads. Tuning gives batch analysis across sessions. Both derive from metrics receipts but serve different audiences (agents vs. humans/operators).

## No dependency edges

Standalone. All prerequisites (NDJSON metrics, governor, .graftignore) are shipped. No other card requires self-tuning as a prerequisite — it is an analysis tool, not a capability gate.

## Effort rationale

Medium. Parsing NDJSON metrics is straightforward, but designing good heuristic rules that produce useful (not noisy) suggestions requires careful threshold calibration. The rules must be evidence-based and the output must be actionable, not just statistical. Testing that suggestions are sensible across different usage patterns adds complexity.
