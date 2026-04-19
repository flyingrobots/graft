---
title: "v0.6.0 bad-code burndown"
legend: CORE
cycle: CORE_v060-bad-code-burndown
---

# v0.6.0 bad-code burndown

## Sponsors

- Human: James (backlog operator, reviewer)
- Agent: Claude (implementation, parallel execution coordinator)

## Hill

Retire every bad-code backlog card in the repository so the v0.6.0
release ships with zero structural debt on the books.

This slice is complete when:

- `docs/method/backlog/bad-code/` is empty
- all changes pass `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- anti-sludge policy checks are adopted and baselined
- the v0.6.0 changelog, version bump, and release check are done

## Playback Questions

### Human

- [ ] Is the bad-code directory empty?
- [ ] Did any bad-code retirements skip the cycle loop (design → build → drift → retro)?
- [ ] Are the anti-sludge policy checks integrated and baselined?
- [ ] Does the changelog accurately reflect what shipped?

### Agent

- [ ] Do all result types use explicit interfaces without `[key: string]: unknown` index signatures?
- [ ] Do all tool handlers serialize through `toJsonObject()` instead of passing results directly?
- [ ] Is the parser classified as an application module with enforced hex layer guardrails?
- [ ] Does `assertToolContext()` validate the full context contract at construction time?
- [ ] Is secret scrubbing applied to both run-capture output and observability arg values?
- [ ] Does worktree identity canonicalize paths through `fs.realpathSync`?
- [ ] Are `SessionTracker` and `RegisteredSession` renamed to unambiguous terms?
- [ ] Does `ToolHandler` receive `ctx` as an explicit parameter instead of closing over it?
- [ ] Does the receipt builder use a mutable draft instead of `as` casts?
- [ ] Are the MCP composition files decomposed into focused sub-modules?

## Non-goals

- [ ] Rewrite the WARP graph ontology or causal collapse model.
- [ ] Restructure `src/` into a final hex directory layout.
- [ ] Ship new user-facing features beyond what the bad-code fixes require.

## Execution notes

This cycle was executed in an unconventional way:

1. **Waves 1-5** (12 sequential cycles): manual execution by a single agent, one card at a time.
2. **Wave 6** (4 parallel agents): MCP composition layer splits executed in isolated worktrees, merged by integration agent.
3. **Waves 7-8** (9 parallel agents across 4 phases): full DAG-based parallel execution with dependency tracking.

Total: 17 agents deployed, 36 bad-code cards retired, plus feature work (symbol identity projection, dynamic project root, attribution hardening, provenance granularity, session disambiguation, explicit context threading).

The cycle loop was violated — cards were retired without design docs or retros for the individual items. This design doc is written retroactively to close the gap.
