---
title: "repo topology for api cli and mcp primary adapters"
legend: "CORE"
cycle: "CORE_repo-topology-for-api-cli-and-mcp-primary-adapters"
source_backlog: "docs/method/backlog/asap/CORE_repo-topology-for-api-cli-and-mcp-primary-adapters.md"
---

# repo topology for api cli and mcp primary adapters

Source backlog item: `docs/method/backlog/asap/CORE_repo-topology-for-api-cli-and-mcp-primary-adapters.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

By the end of this cycle, the repo tells one visible topology story:
API, CLI, and MCP each have an explicit primary-adapter home in the
source tree, the package root is only a thin export root, and the docs
plus guardrails make that structure inspectable for both humans and
agents.

## Playback Questions

### Human

- [ ] Can a human point to one repo-visible doc that names the explicit
      homes of the API, CLI, and MCP primary adapters?
- [ ] Can a human tell the difference between `src/index.ts` as the
      package export root and `src/api/` as the API adapter home?
- [ ] Is the current role of `src/hooks/` obvious rather than confused
      with the three official product entry points?

### Agent

- [ ] Does the source tree contain an explicit `src/api/` primary
      adapter home alongside `src/cli/` and `src/mcp/`?
- [ ] Do lint guardrails treat `src/api/` as a primary-adapter boundary
      instead of leaving API invisible to the hex rules?
- [ ] Are the topology rules and exported surface mechanically
      witnessable in tests?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: One short topology doc
  should name the source-tree roles without requiring architecture
  archaeology across multiple files.
- Non-visual or alternate-reading expectations: The topology contract
  should be readable as plain markdown and testable from source and docs
  without depending on diagrams.

## Localization and Directionality

- Locale / wording / formatting assumptions: Use stable path names and
  straightforward layer vocabulary instead of idioms.
- Logical direction / layout assumptions: The topology explanation
  should read linearly in plain text and not rely on left-to-right
  visuals.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: The repo must make
  the three official adapter homes and the package export root
  mechanically discoverable.
- What must be attributable, evidenced, or governed: Lint rules and
  playback tests should witness the topology instead of leaving it as a
  doc-only claim.

## Non-goals

- [ ] Fully finishing use-case extraction across all three entry points.
- [ ] Rewriting all mixed top-level directories into a perfect final
      hex tree in one cycle.
- [ ] Expanding the public API contract beyond the current root package
      import surface.

## Backlog Context

The repo still makes primary adapter boundaries harder to see than they should be. Shape and execute a directory/topology plan that makes API, CLI, and MCP visibly first-class entry points around one application core instead of leaving API mostly as a root-export convention and the others under `src/cli` and `src/mcp`.

## Expected artifacts

- `src/api/` as the explicit API adapter home
- `src/index.ts` reduced to a thin package export root
- API-aware lint guardrails
- a repo-visible topology doc and matching invariant
- a playback witness for the topology contract
