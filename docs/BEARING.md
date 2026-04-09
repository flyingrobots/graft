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
- Non-read burden policy beyond file reads (measurement exists; policy
  remains later)
- Human-facing UX (git-graft-enhance — cool idea for later)

## What just shipped

Cycle 0023 — WARP Level 1 (v0.4.0): WARP indexer, `graft_since`,
`graft_map`, `graft index` CLI, observer factory with 8 canonical
lenses, directory tree modeling, 11 WARP invariants. 434 tests,
14 tools.

Cycle 0049 — non-read burden instrumentation: receipts now classify
tool burden kind, `stats` reports cumulative burden by kind, and
`doctor` exposes a compact non-read burden summary without introducing
new policy.

Cycle 0050 — shared-daemon trust model: the future shared service is
now defined as same-user and local-machine only by default, with
server-resolved workspace identity, operator-mediated authorization,
isolated session/log state, and default-denied escape hatches.

Cycle 0051 — workspace-binding model: the future daemon now has an
explicit bind/rebind contract, separate transport posture, and a clean
identity split across canonical repo, live worktree, and session-local
state.

Cycle 0052 — daemon binding surface: the MCP server now has an internal
daemon session mode with real `workspace_bind`, `workspace_status`, and
`workspace_rebind` tools, unbound gating for repo-scoped tools, default
run-capture denial in daemon mode, fresh session-local slice reset on
rebind, and same-repo WARP reuse keyed by canonical repo identity.

Cycle 0053 — daemon transport and lifecycle: `graft daemon` now runs a
same-user local MCP daemon on a Unix socket or named pipe, exposes
`/healthz` and `/mcp`, opens and closes daemon sessions by transport
lifecycle, and shares one repo-scoped WARP pool across same-repo daemon
sessions while leaving repo-local `graft serve` unchanged.

Cycle 0054 — daemon control plane: daemon workspace authorization is
now explicit and central, daemon-wide session and workspace inspection
is available through MCP, `/healthz` reflects control-plane counts, and
per-workspace daemon capability posture can now be changed without
exposing another session's receipts or shell output.

Cycle 0055 — persistent monitor runtime: daemon mode now exposes
repo-scoped monitor lifecycle tools, the first worker kind is a
background incremental WARP indexer, monitor state survives daemon
restart, and daemon health now includes bounded monitor and backlog
counts.

## What feels wrong

- WARP indexing is slow on large repos — `core().materialize()`
  per commit with removals is expensive. Background indexing and
  incremental updates needed.
- The first persistent repo-scoped monitor is real, but only for
  background WARP indexing. Multi-repo coordination and same-repo
  concurrent write safety remain open.
- Agent opt-in friction persists. `graft init` can seed `CLAUDE.md`
  and `AGENTS.md`, but most clients still default to native Read unless
  they have a stronger guardrail.
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
6. **Shared-daemon trust boundaries are explicit** — before any
   system-wide daemon claim, client authentication, workspace
   authorization, session/log isolation, and escape-hatch gating must
   be defined and then implemented.
