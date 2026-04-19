---
title: "Cycle 0036 — CLI Surface Completion"
---

# Cycle 0036 — CLI Surface Completion

**Type:** Feature  
**Legend:** CORE

## Hill

When an operator or script uses the CLI instead of an MCP client,
Graft still feels like the same product: bounded reads, structural
navigation, precision lookup, and diagnostics are all available with
equivalent policy and JSON meaning.

## Playback Questions

### Operator

1. Can I use the CLI for bounded reads, structural navigation,
   precision lookup, and diagnostics without falling back to raw shell
   commands?
2. Do the CLI peers preserve the same core policy/refusal semantics as
   the MCP surface?
3. Are the CLI commands grouped into a coherent namespace rather than
   feeling like a pile of MCP tool names?

### Agent / Integrator

1. Do machine-readable CLI results carry versioned schemas?
2. Is there one shared registry describing which capabilities are
   available on which surface?
3. Are the remaining exceptions explicit and narrow rather than
   accidental drift?

## Scope

- grouped CLI peers for bounded reads
- grouped CLI peers for structural navigation
- grouped CLI peers for diagnostics and capture
- shared capability registry for CLI / MCP parity
- explicit decision for `index`

## Non-goals

- CLI peers for session-native mechanics (`set_budget`, `state_save`,
  `state_load`)
- changing MCP transport behavior
- new human-only control plane surface

## Key Decisions

### Grouped CLI namespaces

CLI peers are grouped by job rather than mirroring MCP tool names
1:1:

- `read ...`
- `struct ...`
- `symbol ...`
- `diag ...`

This keeps the CLI legible while still preserving one peer command per
product capability.

### Shared capability registry

Capability metadata lives in one registry so the repo can declare:

- MCP tool name
- CLI command id and path
- parity status

This registry becomes the source for CLI routing and schema coverage.

### `index` stays CLI-only

Explicit indexing is an administrative maintenance operation, not a
normal agent-facing product capability. It remains a narrow CLI-only
exception and is documented as such.

## Success Criteria

- bounded-read, structural, precision, and diagnostic MCP capabilities
  have CLI peers
- CLI peer JSON outputs validate against explicit versioned schemas
- CLI / MCP parity invariant no longer has an open gap for these
  product capabilities
- `index` is no longer an open parity decision
