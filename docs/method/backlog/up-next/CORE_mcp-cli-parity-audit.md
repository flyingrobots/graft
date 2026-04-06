# MCP/CLI parity audit

Run a design-oriented audit of the MCP and CLI surfaces before trying
to force implementation parity directly.

Scope:
- inventory all product-facing MCP capabilities
- inventory all product-facing CLI capabilities
- classify each gap as one of:
  - intentional exception
  - missing CLI peer
  - missing MCP peer
  - semantics mismatch
  - policy/refusal mismatch
  - JSON/output contract mismatch
- define which differences are valid exceptions versus product drift
- split concrete follow-on gaps into separate backlog items

Deliverables:
- one parity matrix covering MCP and CLI surfaces
- one explicit exception list with rationale
- new backlog items for each real gap that should be closed

Why separate cycle:
- this is an audit and design pass that should produce a better backlog,
  not a rushed implementation bundle

Effort: M
