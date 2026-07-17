---
title: on-demand exact MCP output contracts
feature: surface
kind: trunk
legend: SURFACE
lane: cool-ideas
requirements:
  - bounded MCP outputSchema discovery
acceptance_criteria:
  - "An agent can request the exact strict versioned contract for one tool without receiving every tool contract"
  - "The fetched contract is byte-identical in meaning to Graft's runtime validation authority"
  - "Schema identity, version, digest, and compatibility posture are explicit"
  - "Ordinary tools/list remains within its aggregate and per-tool byte budgets"
---

# On-demand exact MCP output contracts

Keep ordinary MCP discovery small while allowing an agent, host, or wrapper to
inspect the complete strict contract for one selected tool when it genuinely
needs deep audit fields.

The first native-output slice projects 47 strict schemas totaling roughly 498
KiB into about 50 KiB of advertised `outputSchema`. That is the correct default
aperture, but the projection intentionally describes nested objects and array
members shallowly. A schema-aware client may sometimes need the exact compact
receipt, full receipt, summary, full diagnostic, or nested evidence grammar.

Candidate surface:

- an MCP resource template such as
  `graft://schemas/mcp/{tool}/{version}`;
- canonical JSON Schema generated from the same Zod authority used at runtime;
- a digest over canonical schema bytes so cached copies can be compared;
- a small index resource listing tool, version, digest, and byte size;
- optional package exports for non-MCP in-process consumers, justified
  separately from the protocol surface.

The resource should be preferable to a new tool call because reading a contract
is discovery, not a repository operation. The server must never inline all
exact contracts into `tools/list`, and it must not maintain a second manually
written schema family.

## Non-goals

- No external hosted registry as the only source of truth.
- No schema prose generated independently from executable validators.
- No automatic loading of exact schemas into every agent context.
- No weakening of the bounded discovery projection.
- No promise that every MCP host renders or caches schema resources equally.
