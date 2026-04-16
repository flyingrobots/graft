---
title: Direct library surface for jedit built-in integration
legend: SURFACE
lane: asap
---

# Direct library surface for jedit built-in integration

Requested by `jedit`.

## Context

`jedit` is moving toward a product posture where Echo and Graft are built-in
engines, not external tools reached primarily through MCP. The current MCP
transport is useful during bring-up, but it is transitional. The long-term
editor needs a stable in-process Graft API for warm structural projections over
live editor truth.

Graft already has useful `StructuredBuffer` capabilities, but `jedit` needs a
clear, supported library-facing integration story rather than treating MCP or
CLI as architectural truth.

## Need

Provide a stable direct library surface for built-in editor integration.

That surface should:

- support long-lived in-process usage from `jedit`
- avoid forcing MCP or CLI framing for core editor interactions
- make the supported editor-facing entrypoints explicit in package exports
- document lifecycle and ownership expectations for parser/projection objects
- be shaped so transport can change without changing warm-layer ownership

## Acceptance criteria

- Graft exposes a clearly documented direct library integration path intended
  for built-in editor usage.
- The public surface names the editor-facing entrypoints that `jedit` should
  rely on for warm projections.
- The docs make it explicit that MCP is transport, not architectural truth.
- The direct API is suitable for dirty-buffer editor use without requiring a
  save-to-disk round trip.

## Non-goals

- Replacing MCP everywhere in the product immediately.
- Designing all future editor features up front.
- Collapsing Graft and `jedit` into one package.
