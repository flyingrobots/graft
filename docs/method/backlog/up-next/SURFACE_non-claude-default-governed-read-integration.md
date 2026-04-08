# Non-Claude default-governed read integration

Cycle 0046 makes Claude hook-backed large JS/TS reads governed before
native `Read` can dump a whole code file into context. The remaining
default-read gap is now explicitly the non-Claude client surface:
Codex, Cursor, Continue, Cline, and any other MCP client where native
reads still bypass graft unless the agent remembers to opt in.

Hill:
- define the minimum honest integration contract for making graft the
  default read path outside Claude's hook model

Questions:
- what is the minimum viable integration for Codex, where hooks are not
  the current control point?
- which clients can support stronger governance versus prompt/bootstrap
  guidance only?
- how do we describe "default" honestly when a client exposes MCP but
  still retains native file reads outside graft control?

Deliverables:
- explicit per-client adoption matrix for non-Claude clients
- follow-on implementation plan for the highest-leverage client surface
- operator-facing docs that distinguish MCP availability from actual
  governed-read behavior

Non-goals:
- pretending one mechanism works uniformly across every editor or agent
- reopening Claude hook semantics unless new evidence says they are
  insufficient

Related:
- `docs/method/backlog/up-next/SURFACE_mcp-runtime-observability.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`

Effort: L
