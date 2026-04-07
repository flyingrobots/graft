# One-step bootstrap parity for supported MCP clients

The 2026-04-07 code-quality audit called out a remaining DX gap:
`graft init` can now write project-local Claude/Codex config directly,
but the other documented clients still require manual copy-paste from
`docs/GUIDE.md`.

Why this matters:
- README and GUIDE present Graft as broadly usable across agent/editor
  clients
- the shortest setup path still depends on which client an operator is
  using
- this keeps time-to-value uneven across the supported surface

Desired end state:
- `graft init` can optionally generate or merge project-local MCP
  configuration for the other documented clients
- writes remain explicit, opt-in, and idempotent
- README and GUIDE teach one-step bootstrap commands for each supported
  client, not just Claude and Codex

Possible scope:
- Cursor
- Windsurf
- Continue
- Cline

Effort: M
