---
title: "Non-Codex instruction bootstrap parity"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: M
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

## Implementation path

1. Research phase: audit each target client (Cursor, Windsurf, Continue, Cline, Zed, JetBrains AI) for repo-local instruction file support. Document the file name, format, and discovery mechanism for each client that supports it.
2. Build a client capability matrix: client name, MCP config support (yes/no), repo-local instruction file (path + format or "not supported"), and any known limitations.
3. For clients with repo-local instruction support: add templates to `graft init` that seed the appropriate instruction file (e.g., `.cursor/rules` for Cursor, `.windsurfrules` for Windsurf). Instruction content should be a compact version of Graft's AGENTS.md — how to use Graft tools, what to read first, session lifecycle.
4. For clients without repo-local instruction support: document explicitly in SETUP.md that these clients operate in MCP-only mode — they discover Graft via MCP tool listings but do not receive repo-local behavioral instructions.
5. Update `graft init` to present the client matrix during initialization: show which clients got full bootstrap (MCP + instructions) vs. MCP-only.
6. Keep the matrix in SETUP.md as an authoritative reference that operators can consult.

## Related cards

- **SURFACE_ide-native-graft-integration**: IDE integration and instruction bootstrap serve the same "meet agents where they work" goal. IDE integration is a VS Code extension (active surface); instruction bootstrap is passive file seeding. Independent implementations, complementary mission.
- **CORE_conversation-primer**: Primer auto-orients agents at session start via `graft_map`. Instruction bootstrap provides static guidance files. Primer is dynamic and runtime; bootstrap is static and scaffolding-time. Independent.
- **CORE_agent-handoff-protocol**: Handoff transfers session context between agents. Bootstrap provides initial orientation for any agent. Different lifecycle moments (mid-session transfer vs. first contact). Independent.

## No dependency edges

All prerequisites are shipped. This card is research + scaffolding — auditing client capabilities and extending `graft init` templates. No other card must ship first, and no downstream card depends on this.

## Effort rationale

Medium. The implementation itself is small (add templates to `graft init`, update docs), but the research phase is the real work: auditing 5+ client instruction file formats, testing whether they actually honor repo-local instructions in practice, and designing instruction content that is useful without Graft-specific context. The client landscape also shifts — formats may change or new clients may emerge — so the matrix needs to be maintainable. Not large because the scaffolding patterns already exist from the Codex bootstrap work.
