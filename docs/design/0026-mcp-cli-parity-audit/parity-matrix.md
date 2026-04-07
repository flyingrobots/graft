# 0026 Parity Matrix

| Capability | CLI | MCP | Status | Notes |
|---|---|---|---|---|
| Initialize graft in a repo (`init`) | Yes | No | Intentional exception | Bootstrap/setup command |
| Start stdio MCP server (default launcher mode) | Yes | N/A | Intentional exception | Transport wiring, not a product capability |
| Explicit WARP indexing (`index`) | Yes | No | Open decision | Decide whether this remains CLI/admin-only or gains an MCP peer |
| Bounded file read (`safe_read`) | No | Yes | Real gap | Core product capability |
| Structural file outline (`file_outline`) | No | Yes | Real gap | Core product capability |
| Targeted range read (`read_range`) | No | Yes | Real gap | Core product capability |
| Change since last observation (`changed_since`) | No | Yes | Real gap | Useful for both agents and operators |
| Structural diff between refs (`graft_diff`) | No | Yes | Real gap | Core structural capability |
| Structural changes since ref (`graft_since`) | No | Yes | Real gap | Core structural capability |
| Structural directory map (`graft_map`) | No | Yes | Real gap | Orientation / inspection capability |
| Focus symbol by name (`code_show`) | No | Yes | Real gap | Precision read capability |
| Search symbols by name (`code_find`) | No | Yes | Real gap | Precision search capability |
| Runtime health / repo state (`doctor`) | No | Yes | Real gap | Debugging / operator capability |
| Explain reason code (`explain`) | No | Yes | Real gap | Core interpretability capability |
| Session / observation stats (`stats`) | No | Yes | Real gap | Debugging / observability capability |
| Structured shell capture (`run_capture`) | No | Yes | Real gap | Operator/debugging capability |
| Session budget control (`set_budget`) | No | Yes | Intentional exception | MCP session-native mechanic |
| Session bookmark save (`state_save`) | No | Yes | Intentional exception | MCP session-native mechanic |
| Session bookmark load (`state_load`) | No | Yes | Intentional exception | MCP session-native mechanic |

## Summary

Current surface state:
- Intentional exceptions: `init`, stdio server bootstrap,
  `set_budget`, `state_save`, `state_load`
- Open decision: `index`
- Real gaps: all bounded-read, structural, precision, and diagnostic
  capabilities

Main conclusion:

The current CLI is not a peer surface to MCP. It is mainly a bootstrap
and maintenance surface. If the project means the parity invariant, the
next cycles must deliberately add operator-facing CLI peers for the
actual product capabilities.
