---
title: "primary adapters thin use-case extraction"
legend: "CORE"
cycle: "CORE_primary-adapters-thin-use-case-extraction"
source_backlog: "docs/method/backlog/up-next/CORE_primary-adapters-thin-use-case-extraction.md"
---

# primary adapters thin use-case extraction

Source backlog item: `docs/method/backlog/up-next/CORE_primary-adapters-thin-use-case-extraction.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Extract the first real repo-local application service out of the MCP
adapter so that:

- governed read behavior for `safe_read`, `file_outline`, `read_range`,
  and `changed_since` lives in a reusable repo-workspace service rather
  than only inside MCP tool handlers
- MCP becomes thinner by delegating those flows into the shared service
- the root package can expose that shared service directly for close
  editor and app integration without forcing callers through MCP
  receipts or CLI subprocesses

## Playback Questions

### Human

- [ ] Can an external app create a repo-local workspace and call direct
      governed read methods without going through MCP receipts?
- [ ] Do `safe_read`, `file_outline`, `read_range`, and `changed_since`
      still behave the same through the MCP surface after extraction?

### Agent

- [ ] Is the observation cache still outside the `mcp` adapter?
- [ ] Is path resolution still outside the `mcp` adapter?
- [ ] Are the read-family tool handlers thinner after the slice?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: The same governed read
  behavior should be available through a direct repo-local workspace API
  without requiring a caller to understand MCP receipts.
- Non-visual or alternate-reading expectations: The extraction should be
  provable through direct tests and plain source inspection rather than
  depending on diagrams or transport-specific behavior.

## Localization and Directionality

- Locale / wording / formatting assumptions: Use stable capability
  names and source paths so the extraction story stays inspectable
  across docs, tests, and code.
- Logical direction / layout assumptions: The same application service
  should work regardless of whether the caller is API, CLI, or MCP.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: The repo should
  expose one shared repo-workspace service and visibly thinner read
  handlers instead of copy-pasted adapter assembly.
- What must be attributable, evidenced, or governed: Playback tests
  should prove the library surface, MCP parity, and adapter-thinning
  claims mechanically.

## Non-goals

- [ ] Extract every MCP tool into application services in one cycle
- [ ] Finalize the stable long-term public library API for every Graft
      capability
- [ ] Remove the remaining MCP transport/result shape from the root
      library surface in this slice

## Backlog Context

Move product behavior out of MCP/CLI tool handlers and into reusable application services. The target is thin primary adapters that validate input, call one application use case, and shape edge-specific output without owning business flow.

For this cycle, the named primary adapters are:

- API
- CLI
- MCP

## Expected artifacts

- a shared repo-local workspace service for governed reads
- a direct package/library surface for that service
- thinner MCP read-family handlers that delegate into the shared service
- playback witness showing direct API use, MCP parity, and thinner
  adapters
