# Invariant: Policy Surfaces Stay Aligned

**Status:** Planned
**Legend:** CORE

Every bounded-read entry point should activate the same policy
contract. A file denied by bans, `.graftignore`, session pressure, or
budget pressure must not become readable simply because the caller used
another product surface.

Today this is a planned invariant, not an enforced one. Hooks, MCP
tools, and other retrieval-adjacent surfaces still drift on policy
inputs and refusal behavior. Cycle 0030 documents the current gap.
Explicit exceptions must be documented and machine-readable.
`run_capture` is the current shell-output escape hatch outside the
bounded-read contract.

## If violated

Graft becomes non-deterministic as a governor. Operators and agents
cannot trust that "denied means denied" across surfaces, and readiness
claims about policy fidelity stop being meaningful.

## How to verify

- the same denied file is denied consistently across hooks and MCP
- `.graftignore`, session depth, and budget flow through every bounded
  read surface
- structural and precision tools do not silently omit denied results
  instead of surfacing an explicit policy outcome
- tests: `test/unit/policy/cross-surface-parity.test.ts`
