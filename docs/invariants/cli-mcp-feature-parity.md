# Invariant: CLI and MCP Peers Stay Aligned When Both Exist

**Status:** Enforced
**Legend:** CORE

## What must remain true

When a capability is intentionally available on both the CLI surface and
the MCP surface, those peers should stay aligned.

CLI/MCP peer parity means:
- the same core capability exists on both surfaces
- the same refusal and policy semantics apply
- machine-readable outputs carry the same meaning, even if transport
  formatting differs

This invariant is narrower than the full three-entrypoint surface
contract. API is first-class too, but API does not need to mimic CLI or
MCP transport shaping when a better typed direct surface exists.

Allowed exceptions must be explicit and narrow:
- bootstrap / setup commands
- admin / maintenance commands
- transport-only wiring details
- human-only control-plane affordances

Current explicit exceptions:
- CLI-only: `init`, `index`, default stdio launcher mode
- MCP-only: `set_budget`, `state_save`, `state_load`

If a capability exists on only one of CLI or MCP, the repo should
either:
- document it as an intentional exception, or
- track the missing peer surface as follow-on work

## Why it matters

If CLI and MCP drift apart where both are intended, Graft becomes two
products with two different truths. Agents learn one feature set,
operators debug another, tests cover one path while users hit another,
and policy fidelity becomes much harder to reason about.

Feature parity keeps the product legible:
- MCP remains the primary agent surface
- CLI remains a truthful debugging, scripting, and operator surface
- docs, tests, and release notes describe one coherent governor

## How to check

- Every intended CLI/MCP peer capability has a CLI peer, or a documented
  exception
- Every intended CLI/MCP peer capability has an MCP peer, or a documented
  exception
- Policy/refusal behavior matches across both surfaces
- JSON output schemas describe equivalent capability semantics on both
  surfaces
- Release review includes a surface-parity check for new features
