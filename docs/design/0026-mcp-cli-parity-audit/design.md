# Cycle 0026 — MCP/CLI Parity Audit

**Sponsor human:** Repository Operator
**Sponsor agent:** Adoption / Debugging Agent

## Premise

Graft now declares a planned invariant that product-facing CLI and MCP
capabilities should remain at feature parity, with only explicit narrow
exceptions.

Right now that parity does not exist.

The CLI surface is mostly:
- `init`
- `index`
- the stdio MCP launcher

The MCP surface is the actual operating product:
- bounded reads
- structural diffs and maps
- symbol precision tools
- diagnostics and explainability
- session mechanics

That asymmetry may be acceptable in some places, but today it is mostly
implicit. The repo does not yet have:
- a parity matrix
- an explicit exception list
- a shared language for "real gap" versus "valid one-surface-only"

Before implementing parity directly, the repo needs an audit cycle that
turns that ambiguity into a concrete backlog.

## Hill

The repo can say, for every product-facing capability, whether it
exists on both surfaces, is an intentional narrow exception, or is a
real parity gap with follow-on work attached.

## Playback questions

### Agent perspective

- Can I tell whether a capability is available through MCP, CLI, or
  both without reverse-engineering the repo? **Must be yes.**
- If a capability exists on only one surface, can I tell whether that is
  intentional or just drift? **Must be yes.**
- Does the audit preserve capability parity as the goal, rather than
  treating MCP and CLI as separate products? **Must be yes.**

### Operator perspective

- Can I reproduce or inspect core product behavior from the CLI when the
  MCP client path is unavailable? **Should be yes** for core read,
  structural, and diagnostic capabilities.
- Are bootstrap/setup and transport-only exceptions explicitly named
  instead of being smuggled in by habit? **Must be yes.**
- Does the audit produce concrete follow-on backlog instead of one vague
  umbrella item? **Must be yes.**

### Maintainer perspective

- Can a maintainer tell, during feature work, whether they also need a
  peer CLI or MCP surface? **Must be yes.**
- Does the repo have one place to look for current surface drift?
  **Must be yes.**

## Non-goals

- Implementing full parity in this cycle
- Forcing one command-per-tool naming symmetry
- Pretending transport/session mechanics are user-facing capabilities
- Solving the full JSON-schema/versioning backlog in this cycle

## Design

### Capability-Level Parity, Not Name-Level Parity

Parity is about capability meaning, not one-to-one command names.

Examples:
- MCP `safe_read` does not require a CLI command literally named
  `safe_read`, but the bounded-read capability should have a CLI peer.
- MCP `code_show` and `code_find` may end up as CLI subcommands under a
  precision or navigation namespace rather than flat top-level commands.

The question is:
"Can the operator or agent reach the same product capability from both
surfaces?"

### Allowed Exceptions

The audit recognizes only narrow exception classes:

- bootstrap / setup
- transport-only wiring
- session-native transport mechanics
- future human-only control-plane affordances

This keeps the parity rule strict while still making room for surfaces
that are genuinely transport-bound.

### Current Surface Model

The audit classifies current capabilities into three buckets:

1. **Intentional exceptions**
2. **Real parity gaps**
3. **Open decisions**

The current expected classification is:

- `init` -> intentional CLI-only bootstrap/setup
- stdio server startup -> intentional CLI-only transport wiring
- `set_budget`, `state_save`, `state_load` -> intentional MCP-only
  session-native mechanics
- explicit `index` -> open decision: valid admin exception or missing
  MCP peer?
- bounded read / structural / diagnostic capabilities -> real gaps,
  because MCP currently carries the product while CLI mostly does not

### Audit Deliverables

This cycle should ship:

1. one parity matrix
2. one explicit exception list
3. one split backlog for the real gaps

That gives the repo a durable answer to "what is intentionally
one-surface-only?" and prevents the broader parity invariant from
remaining hand-wavy.

### Follow-on Shape

The audit is expected to split concrete work into separate cycles:

- CLI bounded-read surface
- CLI structural-navigation surface
- CLI diagnostics/capture surface
- explicit decision on indexing parity
- shared capability registry / manifest so future features do not drift

## Deliverables

1. Official 0026 design doc
2. Parity matrix for current CLI and MCP surfaces
3. Explicit exception list with rationale
4. Concrete follow-on backlog split

## Effort

M — design / audit cycle

## Accessibility / assistive reading posture

The parity matrix and exception list should remain scannable as plain
linear text and markdown tables.

## Localization / directionality posture

Surface names and exception labels should avoid spatial metaphors.

## Agent inspectability / explainability posture

This audit should make it obvious, in docs and backlog, whether a
feature is:
- parity-complete
- intentionally one-surface-only
- pending follow-on work
