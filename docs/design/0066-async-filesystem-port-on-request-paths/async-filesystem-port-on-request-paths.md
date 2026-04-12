---
title: "Async filesystem port on request paths"
legend: "CORE"
cycle: "0066-async-filesystem-port-on-request-paths"
source_backlog: "docs/method/backlog/up-next/CORE_async-filesystem-port-on-request-paths.md"
---

# Async filesystem port on request paths

Source backlog item: `docs/method/backlog/up-next/CORE_async-filesystem-port-on-request-paths.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

- A daemon or repo-local MCP workspace can bind and load `.graftignore`
  without relying on `readFileSync` on the shared request path.
- Policy-governed read and precision entry points consume file content
  through the async filesystem port by default, with remaining sync-only
  CLI and hook reads called out as explicit debt rather than ambient
  behavior.

## Playback Questions

### Human

- [ ] Does workspace binding still behave the same for repos with and
  without `.graftignore`, while avoiding daemon event-loop stalls from
  sync file reads?
- [ ] Are remaining sync filesystem reads clearly outside the shared MCP
  request path, so operators know what is and is not fixed by this
  cycle?

### Agent

- [ ] Can I exercise daemon workspace binding and governed reads with a
  filesystem port that throws on `readFileSync` and still get lawful
  results?
- [ ] Is the async posture proven at the seam where policy context is
  built, rather than only in lower-level operations tests?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: TBD
- Non-visual or alternate-reading expectations: TBD

## Localization and Directionality

- Locale / wording / formatting assumptions: TBD
- Logical direction / layout assumptions: TBD

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: TBD
- What must be attributable, evidenced, or governed: TBD

## Non-goals

- [ ] Remove all synchronous filesystem reads from CLI bootstrap or hook
  code in this cycle.
- [ ] Redesign the filesystem port contract beyond what is needed to
  keep shared MCP request paths async by default.

## Backlog Context

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
