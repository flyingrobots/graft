# Async filesystem port on request paths

Move daemon-heavy MCP request paths off `readFileSync` and onto the
existing async filesystem port.

Why:
- large or unlucky sync reads still block the daemon event loop
- the port is already partly async, but key MCP surfaces still opt into
  sync reads as a legacy convenience
- fairness scheduling is weaker if file IO remains sync inside workers
  or inline handlers

Scope:
- remove default use of `ctx.fs.readFileSync(...)` on MCP read and
  precision paths
- make policy preflight and structural read surfaces async where needed
- preserve lawful unreadable-file behavior
- leave CLI-only and hook-only sync reads as explicit debt if they are
  not on the shared daemon path yet

Non-goals:
- worker pool implementation
- full port runtime-guard redesign

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_ports-filesystem.md`

Effort: M
