# Bearing: WARP Level 2+

**Set:** 2026-04-05
**Direction:** Deeper structural memory. Symbol identity, agent
provenance, precision tools.

## Why now

v0.4.0 shipped WARP Level 1. Structural memory exists as a
first-class substrate. The indexer writes structural delta patches
per commit. `graft_since` and `graft_map` give agents instant
structural queries. The Observer Law holds.

Level 1 answers "what changed structurally?" Level 2+ answers
"who changed it, why, and what did they see before they changed it?"

## What ships under this bearing

1. **Phase 2 precision tools** — `code_show`, `code_find`. Focus
   on a symbol by name, search for symbols across the project.
2. **Symbol identity across renames** (Level 2) — name-based
   identity works but breaks on renames. Structural identity
   derived from continuity and provenance.
3. **Agent action provenance** (Level 3) — record reads and writes
   as WARP observations. The causal chain of what the agent saw
   before it wrote becomes the reasoning trace.

## What does NOT ship under this bearing

- Live study execution (infrastructure built, study runs when ready)
- Non-read burden measurement (needs study data first)
- Human-facing UX (git-graft-enhance — cool idea for later)

## What just shipped

Cycle 0023 — WARP Level 1 (v0.4.0): WARP indexer, `graft_since`,
`graft_map`, `graft index` CLI, observer factory with 8 canonical
lenses, directory tree modeling, 11 WARP invariants. 434 tests,
14 tools.

## What feels wrong

- WARP indexing is slow on large repos — `core().materialize()`
  per commit with removals is expensive. Background indexing and
  incremental updates needed.
- Agent opt-in friction persists. `graft init` generates the
  CLAUDE.md snippet but agents still default to native Read.
- CodeRabbit rate limiting still painful on multi-commit PRs.

## Bar For General System-Wide Use

Do not declare Graft ready for default use across arbitrary projects
on this machine until all of these are true:

1. **Unsupported-file degradation is honest** — no more fake empty code
   outlines for Markdown or other unsupported text.
2. **Policy fidelity is unified** — MCP, CLI, hooks, historical reads,
   working-tree reads, budget/session handling, and `.graftignore`
   all enforce the same contract.
3. **Structured outputs are versioned** — every machine-readable MCP /
   CLI surface has an explicit JSON schema with versioning.
4. **Layered worldline semantics exist in code, not just design** —
   commit worldline, ref views, and workspace overlay are enforced by
   implementation and tests.
5. **Language coverage is broadened or the boundary is explicit** —
   either support expands beyond JS/TS, or non-JS/TS repos degrade so
   clearly and lawfully that "general use" is still honest.
