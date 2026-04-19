---
title: "three-surface capability baseline and parity matrix"
legend: "CORE"
cycle: "CORE_three-surface-capability-baseline-and-parity-matrix"
source_backlog: "docs/method/backlog/asap/CORE_three-surface-capability-baseline-and-parity-matrix.md"
---

# three-surface capability baseline and parity matrix

Source backlog item: `docs/method/backlog/asap/CORE_three-surface-capability-baseline-and-parity-matrix.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Settle one truthful capability baseline for Graft’s three official
entry points so that:

- API, CLI, and MCP availability is visible in one place
- direct API exposure kinds are named explicitly
- CLI/MCP peer posture is explicit per capability instead of implied by
  habit
- release and backlog review can reason from the same matrix instead of
  reconstructing product shape from scattered docs
- the matrix is backed by an executable witness against the capability
  registry so it does not drift silently

## Playback Questions

### Human

- [ ] Can a human answer “where is this capability available?” for API,
      CLI, and MCP from one matrix doc?
- [ ] Can a human tell the difference between direct typed API surfaces
      and tool-bridge API exposure?
- [ ] Are the current CLI-only, MCP-only, and API-only exceptions
      obvious rather than surprising?

### Agent

- [ ] Does the capability registry explicitly model all three entry
      points?
- [ ] Is there one doc artifact whose rows stay in sync with the
      registry?
- [ ] Are the current baseline counts and exceptions mechanically
      witnessable in tests?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - one summary section
  - one table
  - one legend for API exposure and CLI/MCP posture
- Non-visual or alternate-reading expectations:
  - no information is only carried in diagrams
  - the table remains readable as plain markdown text

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - internal capability ids remain ASCII and code-oriented
  - CLI paths remain space-delimited command strings
- Logical direction / layout assumptions:
  - entry points are presented in the stable order API, CLI, MCP
  - the matrix is descriptive repo truth, not a normative UX ranking

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - surface availability
  - API exposure kind
  - CLI path when present
  - MCP tool id when present
  - current CLI/MCP peer posture
- What must be attributable, evidenced, or governed:
  - the matrix rows must come from the capability registry
  - current single-surface exceptions must be named explicitly
  - the playback witness must fail if registry rows drift away from the
    matrix doc

## Non-goals

- [ ] Achieve full feature parity across all three entry points in this
      cycle
- [ ] Add new product capabilities just to fill matrix gaps
- [ ] Replace the capability registry with generated code in this cycle
- [ ] Reorganize the repo topology in the same slice

## Backlog Context

Now that API, CLI, and MCP are official entry points, the repo needs one truthful capability matrix that names baseline availability and intended parity across all three. This should include direct API exposure kind (`tool_bridge`, `repo_workspace`, `structured_buffer`), intentional single-surface exceptions, and executable witnesses where parity is expected.

## Expected artifacts

- a human-readable capability baseline doc
- registry metadata that explicitly names the three surfaces
- a playback witness that proves the matrix doc tracks the registry
