---
title: "Conversation primer — auto-orient at session start"
feature: session
kind: trunk
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "graft_map tool (shipped)"
  - "Session tracking (shipped)"
  - "MCP server bootstrap (shipped)"
  - "Budget governor (shipped)"
acceptance_criteria:
  - "At conversation start, graft_map runs on a default scope and injects the result into the session bootstrap"
  - "The agent begins oriented with directory structure, major symbols, and drill-down targets"
  - "The primer is compact enough for small-context clients (configurable scope)"
  - "The primer refreshes after writes or branch switches within the session"
  - "Primer scope is configurable via .graftrc (default scope, max depth, include/exclude patterns)"
---

# Conversation primer — auto-orient at session start

Use `graft_map` as a session-start primer instead of waiting for the
agent to discover it manually.

At conversation start, run `graft_map` on a default scope like `src/`
and inject the result into the session bootstrap or system prompt.
The agent begins already oriented:

- what directories and files matter
- the major symbols already present
- where to drill with `code_show` or `file_outline`

This is distinct from a manual codebase orientation map:
the value is not just that the map exists, but that it becomes the
default first context instead of an opt-in extra step.

## Implementation path

1. Add a primer configuration to .graftrc: default scope (repo root, `src/`, or auto-detected), max depth, size budget for the primer output
2. At MCP session initialization, run `graft_map` with the configured scope and inject the result into the session bootstrap response
3. Implement scope heuristics: detect common project structures (src/, lib/, app/) and pick an appropriate default if not configured
4. Add a size guard: if the primer would exceed a configurable token budget, reduce depth or switch to directory-only mode
5. Wire primer refresh into the monitor tick: after writes or branch switches, regenerate the primer so it stays current
6. Expose a `graft_primer` tool for manual re-trigger if the agent wants a fresh orientation mid-session

## Related cards

- **CORE_auto-focus**: Primer provides initial orientation at session start; auto-focus provides ongoing targeting during reads. Different lifecycle phases — primer is the "cold start" solution, auto-focus is the "warm session" solution. Not dependent.
- **CORE_cross-session-resume**: Resume provides orientation for RETURNING sessions via structural diff. Primer provides orientation for FRESH sessions via graft_map. They serve different cases and could coexist: resume when state_load finds a saved state, primer when starting clean.
- **CORE_context-budget-forecasting**: Forecasting could inform primer scope — "this scope would cost X% of budget, reducing depth to stay under Y%." Not a hard dependency but a natural pairing.
- **CORE_session-knowledge-map**: After the primer runs, the knowledge map would show "primer injected: N files outlined, M symbols visible." Complementary but not dependent.
- **WARP_minimum-viable-context**: MVC provides task-specific context; primer provides general orientation. Different triggers (task assignment vs. session start).

Questions:

- what default scope should be primed: repo root, `src/`, or a
  heuristic target?
- how do we keep the primer compact enough for small-context clients?
- when should the primer refresh after writes or branch switches?
- should this live in hooks, MCP client integration, or a separate
  bootstrap helper?

Why cool:

- it reduces adoption friction without requiring full read-path
  interception
- it makes the best structural surface (`graft_map`) show up before
  the first warmup read
- it complements `CORE_codebase-orientation-map` (v0.7.0) and `CORE_auto-focus`
  rather than replacing them

Prompted by external dogfood feedback:
- "`graft_map` as conversation primer"
- "the agent starts every conversation already oriented"

## No dependency edges

All prerequisites are shipped. The primer is orchestration — wiring the existing `graft_map` tool into the MCP session lifecycle. No other card must ship first, and no downstream card requires primer as a hard prerequisite.

## Effort rationale

Medium. The core implementation (run graft_map at session start) is small, but the design surface around scope heuristics, size budgets, refresh triggers, and .graftrc configuration adds enough work to push past S. Not L because no new primitives are needed — it's wiring existing tools into a lifecycle hook.
