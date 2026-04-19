---
title: "warp port and adapter boundary"
legend: "CORE"
cycle: "CORE_warp-port-and-adapter-boundary"
source_backlog: "docs/method/backlog/up-next/CORE_warp-port-and-adapter-boundary.md"
---

# warp port and adapter boundary

Source backlog item: `docs/method/backlog/up-next/CORE_warp-port-and-adapter-boundary.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

By the end of this cycle, Graft depends on one explicit WARP capability
contract instead of raw `WarpApp` types and ad hoc cast seams. CLI, MCP,
and shared local-history code should consume that port, while concrete
`@git-stunts/git-warp` usage stays inside the secondary adapter layer.

## Playback Questions

### Human

- [ ] Can a human point to one repo-visible WARP port contract instead
      of discovering graph capabilities by reading scattered raw
      `WarpApp` call sites?
- [ ] Can a human see that shared MCP and CLI code talk to an explicit
      WARP handle type rather than importing `@git-stunts/git-warp`
      directly?
- [ ] Is the local-history graph seam no longer a cast-based “trust me”
      adapter?

### Agent

- [ ] Does `src/ports/warp.ts` define the WARP handle, observer, patch,
      and materialization contract used by the rest of the repo?
- [ ] Does `openWarp()` return that port handle while keeping raw
      `@git-stunts/git-warp` usage inside the adapter layer?
- [ ] Do MCP and CLI surfaces use the port type for pooling, context,
      precision reads, and local-history graph access?
- [ ] Is there a playback witness that mechanically proves the boundary
      instead of leaving it as a refactor-by-convention?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: One port file should name
  the graph capabilities plainly enough that a reader does not need to
  reverse-engineer WARP from several call sites.
- Non-visual or alternate-reading expectations: The port contract and
  playback witness should be readable as plain text and source without
  requiring diagrams.

## Localization and Directionality

- Locale / wording / formatting assumptions: Prefer stable layer names
  and interface vocabulary over idioms.
- Logical direction / layout assumptions: The design should read
  linearly in plain markdown and not rely on left-to-right visuals.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: The repo must make
  the WARP capability surface inspectable as one contract with
  deterministic method names.
- What must be attributable, evidenced, or governed: Playback tests
  should witness the new port and the removal of cast-based seams.

## Non-goals

- [ ] Fully eliminating direct `openWarp()` calls from every composition
      root in one cycle.
- [ ] Reorganizing the entire `src/warp/` directory into its final
      long-term topology.
- [ ] Replacing WARP semantics with a fake generic graph abstraction
      that erases the real substrate.

## Backlog Context

Introduce a first-class WARP port so Graft depends on an explicit graph capability contract rather than direct `openWarp()` calls and cast-based seams. The goal is one truthful secondary adapter for graph commitment and observer reads.

## Expected artifacts

- `src/ports/warp.ts` with the explicit WARP contract
- `src/warp/open.ts` returning the port handle instead of raw `WarpApp`
- CLI/MCP/shared local-history code depending on the port instead of raw
  `@git-stunts/git-warp` types
- removal of the `asPersistedLocalHistoryGraphWarp(...)` cast seam
- a playback witness for the boundary
