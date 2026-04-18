---
title: "Extend governor thinking beyond file reads"
---

# Extend governor thinking beyond file reads

Source backlog item: `docs/method/backlog/up-next/CORE_non-read-burden.md`
Legend: CORE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Non-read burden is measurable on the live MCP surface: receipts classify
tool burden kind, stats break returned bytes down by burden kind, and
doctor exposes a compact non-read burden summary without adding new
governor policy.

## Playback Questions

### Human

- [x] Can graft show where session burden is coming from beyond file
  reads without guessing at policy first?

### Agent

- [x] Do receipts classify the current tool by burden kind and mark
  whether it is non-read?
- [x] Do stats and doctor expose cumulative non-read burden in
  operator-readable form?
- [x] Do lint, focused tests, and full tests pass after the schema
  changes?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: keep the burden categories
  small, stable, and directly inspectable in JSON
- Non-visual or alternate-reading expectations: operator surfaces should
  expose summaries without requiring log scraping

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  behavior in scope
- Logical direction / layout assumptions: none beyond standard
  left-to-right source review

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the mapping from
  MCP tool to burden kind
- What must be attributable, evidenced, or governed: receipts and
  runtime events must carry the burden classification so analysis can be
  done after the fact

## Non-goals

- [x] Do not add new burden caps or pagination policy in this cycle
- [x] Do not attempt to measure subagent output here; graft is not the
  orchestrator for those results yet
- [x] Do not reinterpret read policy; this cycle is instrumentation only

## Backlog Context

Blacklight shows context burden comes from ALL tool output, not
just file reads:

- Shell output (Gemini: 10.3 KB avg vs Claude: 1.6 KB)
- Batch read tools (105 KB avg per call)
- Subagent results (71% return 25 KB+)
- Search results (grep, glob)
- Git log output
- Build error messages

run_capture addresses shell output. Tripwires catch runaway tool
loops. But there's no policy on:
- Search result size
- Git log verbosity
- Subagent output bloat

## What this might look like

- `run_capture` as the default for ALL shell output (not opt-in)
- Search result pagination/summarization
- Subagent output caps (when graft is the orchestrator)
- Per-tool-type burden tracking in receipts

## Priority

After the live study — let data show which non-read sources are
the biggest burden. Don't optimize in the dark.

Effort: M
