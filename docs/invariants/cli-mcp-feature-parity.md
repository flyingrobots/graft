# Invariant: CLI and MCP Surfaces Stay at Feature Parity

**Status:** Enforced
**Legend:** CORE

## What must remain true

Product-facing capabilities should be available through both the CLI
surface and the MCP surface.

Parity means:
- the same core capability exists on both surfaces
- the same refusal and policy semantics apply
- machine-readable outputs carry the same meaning, even if transport
  formatting differs

Allowed exceptions must be explicit and narrow:
- bootstrap / setup commands
- admin / maintenance commands
- transport-only wiring details
- human-only control-plane affordances

Current explicit exceptions:
- CLI-only: `init`, `index`, default stdio launcher mode
- MCP-only: `set_budget`, `state_save`, `state_load`

If a capability exists on only one surface, the repo should either:
- document it as an intentional exception, or
- track the missing peer surface as follow-on work

## Why it matters

If CLI and MCP drift apart, Graft becomes two products with two
different truths. Agents learn one feature set, operators debug
another, tests cover one path while users hit another, and policy
fidelity becomes much harder to reason about.

Feature parity keeps the product legible:
- MCP remains the primary agent surface
- CLI remains a truthful debugging, scripting, and operator surface
- docs, tests, and release notes describe one coherent governor

## How to check

- Every product-facing MCP capability has a CLI peer, or a documented
  exception
- Every product-facing CLI capability has an MCP peer, or a documented
  exception
- Policy/refusal behavior matches across both surfaces
- JSON output schemas describe equivalent capability semantics on both
  surfaces
- Release review includes a surface-parity check for new features
