---
title: "0026 Explicit Exception List"
---

# 0026 Explicit Exception List

## Intentional CLI-only exceptions

### `init`

Why it is allowed:
- bootstrap / onboarding command
- writes project scaffolding and prints setup guidance
- not a core read / structural / diagnostic capability

### default stdio launcher mode

Why it is allowed:
- transport wiring, not a user-facing product capability
- the CLI entry point is how the MCP server is started

## Intentional MCP-only exceptions

### `set_budget`

Why it is allowed:
- session-native transport mechanic
- meaningful only when a long-lived MCP session exists

### `state_save`

Why it is allowed:
- session-native bookmark / coordination mechanic
- meaningful primarily inside an active MCP session

### `state_load`

Why it is allowed:
- session-native bookmark / coordination mechanic
- meaningful primarily inside an active MCP session

## Open decision

### `index`

This cycle does not force a final answer.

Possible outcomes:
- keep it CLI/admin-only and document it as an explicit exception
- add an MCP peer for explicit indexing control

Why it stays open:
- explicit indexing sits between product capability and maintenance
  operation
- the right answer depends on how much control the MCP surface should
  expose over persistent structural state
