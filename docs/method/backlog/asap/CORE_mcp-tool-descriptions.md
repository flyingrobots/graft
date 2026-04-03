# MCP tool descriptions for agent UX

The MCP tool schemas (shown to agents via listTools) currently
have no descriptions — just parameter names from zod. Adding
explicit descriptions would help agents understand what each tool
does without external documentation.

The tool schema IS the documentation for an agent. A good
description on safe_read would say: "Policy-enforced file read.
Returns content for small files, structural outline for large
files, refusal for banned files. Every response includes a
_receipt block."

This is pure agent UX — zero implementation complexity.
