---
title: "Non-Codex instruction bootstrap parity"
requirements:
  - "graft init scaffolding (shipped)"
  - "AGENTS.md bootstrap for Codex (shipped)"
  - "MCP config seeding for non-Claude clients (shipped)"
acceptance_criteria:
  - "A client-by-client matrix documents which non-Claude/non-Codex clients honor repo-local instruction files"
  - "For clients that support repo-local instructions, graft init seeds the appropriate instruction file"
  - "For clients that do not support repo-local instructions, docs explicitly state MCP-only status"
  - "Setup docs make the boundary between full-bootstrap and MCP-only clients obvious"
  - "No instruction file is seeded for a client that cannot use it"
---

# Non-Codex instruction bootstrap parity

Cycle 0047 gives Codex a stronger bootstrap path by seeding `AGENTS.md`
alongside `.codex/config.toml`. The remaining non-Claude clients still
get MCP config only: Cursor, Windsurf, Continue, Cline, and similar
surfaces do not yet receive an equivalent repo-local instruction layer.

Hill:
- determine whether those clients have a real repo-local instruction
  bootstrap path worth automating, or whether the honest answer is to
  leave them MCP-only

Questions:
- which non-Claude, non-Codex clients actually honor repo-local
  instruction files?
- should `graft init` seed shared instructions such as `AGENTS.md` for
  those clients too, or would that overpromise behavior they do not use?
- if parity is impossible, how should the setup docs keep that boundary
  obvious?

Deliverables:
- explicit client-by-client answer for repo-local instruction support
- follow-on implementation plan if any additional client is worth
  bootstrapping
- docs update if the honest answer is "Codex only for now"

Effort: M
