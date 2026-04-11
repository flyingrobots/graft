# Invariant: Transport Session Is Not Causal Session

**Status:** Planned
**Legend:** WARP

## What must remain true

Daemon or MCP transport session identifiers are correlation handles, not
the final product definition of a session.

The product session model must be able to outlive reconnects and
preserve a coherent causal workspace across tool calls until a strand is
collapsed, forked, or abandoned.

## Why it matters

If transport lifetime is treated as the real session boundary, the
between-commit provenance model becomes accidental network/session
bookkeeping rather than a truthful record of one line of work.

## How to check

- Product docs do not equate socket/session ids with causal identity
- Causal workspace identity can be modeled separately from transport
  lifetime
- Receipts may carry transport/session correlation without claiming that
  this is the full provenance model
