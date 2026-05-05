---
title: "GraftToolClient for stable in-process tool calls"
feature: api
kind: trunk
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Public API review"
  - "Tool bridge parity tests"
  - "MCP output schema stability"
acceptance_criteria:
  - "A typed client can call public Graft tools through one stable interface"
  - "The client preserves current MCP tool names and result schemas"
  - "The client exposes structured errors without hiding validation failures"
  - "The public API impact is explicitly versioned before export"
---

# GraftToolClient for stable in-process tool calls

Source: 2026-05-04 code-quality audit cool-idea prompt.

## Problem

Library consumers can use `createGraftServer`, `callGraftTool`, and
`parseGraftToolPayload`, but repeated caller code still has to manage
tool names, argument objects, result parsing, and error handling.

A small client could make in-process tool use less error-prone without
turning MCP into the only local integration path.

## Sketch

`GraftToolClient` would wrap a `GraftServer` or repo-local Graft
instance and expose typed methods for stable public tools:

- `safeRead`
- `fileOutline`
- `readRange`
- `changedSince`
- `graftDiff`
- `stats`

The client should use existing schemas and result models. It should not
invent a second contract.

## Public API Note

Exporting this from the package root would be an additive public API
change. It should be treated as minor-version work unless the
implementation remains internal to tests or adapters.

## No Dependency Edges

This is related to the MCP invocation pipeline because both reduce tool
call friction. It is not a prerequisite for that hardening work.
