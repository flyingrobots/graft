---
title: Causal blame for staged artifacts
requirements:
  - WARP graph ontology and causal collapse model (backlog)
  - Persisted sub-commit local history (backlog)
  - Provenance attribution instrumentation (backlog)
acceptance_criteria:
  - A surface (why_changed or stage-explain) returns the causal slice for a given staged file
  - The causal slice includes the reads, writes, and transitions that contributed to the staged change
  - Output is scoped to the specific staged target, not the full session replay
  - An agent can inspect causal blame before committing to verify correctness
  - A human can audit agent work via causal blame without reading the full session log
  - A test verifies that causal blame for a staged file traces back to the reads that informed the edit
blocked_by:
  - CORE_rewrite-structural-blame-to-use-warp-worldline-provenance
---

# Causal blame for staged artifacts

Humans and agents both need a direct answer to:

"Why did this staged file / symbol change happen?"

This is not ordinary structural blame. Structural blame answers which
commit last changed a symbol. Causal blame should answer which
between-commit reads, writes, decisions, and transitions contributed to
the currently staged artifact set.

Example:
- agent read `server.ts`
- agent read `policy.ts`
- agent edited `server.ts`
- branch switched
- agent re-read `server.ts`
- only `src/server.ts` was staged

Graft should be able to compute the causal slice for that staged target
and explain the change without replaying the full session.

Potential surface:
- `why_changed(path)`
- `graft stage-explain`
- a Git enhancement view over `git diff --cached`

Why it matters:
- agents need a precise way to inspect whether they are about to commit
  the right thing
- humans need a way to audit agent work without reading the entire chat
  or session replay
- this is the first user-facing payoff of strand collapse by causal
  slice

Depends on:
- `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`

Effort: L
