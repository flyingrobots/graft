---
title: Output schema registry is doing too much in one file
lane: graveyard
legend: CLEAN
---

# Output schema registry is doing too much in one file

## Disposition

Retired after splitting the output schema registry into shared fragment, MCP body, CLI body, and metadata modules while keeping src/contracts/output-schemas.ts as a thin public barrel.

## Original Proposal

File: `src/contracts/output-schemas.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- one file owns schema metadata, shared fragments, MCP bodies, CLI bodies, envelope helpers, and JSON Schema export
- this is a maintainability hotspot even though the runtime behavior is solid

Desired end state:
- split shared fragments, MCP schemas, and CLI schemas into smaller modules
- keep one public barrel without keeping one giant implementation file

Effort: M
