---
title: CLI output type map still erased by schema helper typing
legend: CLEANCODE
lane: graveyard
---

# CLI output type map still erased by schema helper typing

## Disposition

CLI output typing now preserves concrete body schemas plus schema-only vs peer-command common fields, and validateCliOutput(...) returns CliOutputFor<K> rather than a generic record. The asymmetry with the MCP output map is no longer repo truth.

Replacement: `src/contracts/output-schemas.ts`

## Original Proposal

## Problem

`McpOutputFor<K>` is now useful for the direct API surface because the MCP body schema map preserves per-tool schema specificity. The equivalent CLI type surface still erodes to `unknown` or generic `ZodType` because `CLI_OUTPUT_SCHEMAS` and the helper stack (`withCliCommon`, `withCliPeerCommon`) still erase the concrete schema map.

## Why it matters

Graft now treats API, CLI, and MCP as first-class surfaces. If the API surface gets schema-backed output typing but CLI helper typing remains erased, the three-surface posture is still asymmetrical at the contract layer.

## Desired outcome

Preserve concrete CLI output schema types through the helper stack so `CliOutputFor<K>` is as useful and truthful as the MCP output map.
