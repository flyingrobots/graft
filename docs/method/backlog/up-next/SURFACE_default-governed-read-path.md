# Default governed read path

Recurring dogfood feedback from 2026-04-05 and 2026-04-07 is that
agents still forget to use Graft unless explicitly reminded. The tools
work when chosen, but the product still depends on conscious opt-in.

Hill:
- the normal file-read path should become Graft-governed by default, or
  close enough that using native read surfaces no longer defeats the
  product

Questions:
- should this happen via stronger client integration, better hooks, or
  both?
- what is the minimum integration path that changes behavior without
  making setup or failure modes unacceptable?
- how do we keep the system honest when native reads still exist outside
  Graft control?
- what is the product contract for "default" across Claude, Codex,
  Cursor, Continue, and other clients?

Deliverables:
- explicit adoption model for making Graft the default read path
- split between hook-based guardrails and true client/runtime
  integration
- follow-on backlog for the actual client-specific work

Why separate cycle:
- this is a product-adoption problem, not just a doc tweak
- the core feedback is not "the tools are bad" but "the tools are too
  easy to forget"

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`

Effort: L
