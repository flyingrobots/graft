---
title: "Cycle 0035 — Versioned JSON Output Schemas"
---

# Cycle 0035 — Versioned JSON Output Schemas

**Hill:** Every machine-readable MCP and CLI surface now has an
explicit versioned output contract. MCP results carry a `_schema`
marker, CLI commands support `--json`, and tests validate emitted
payloads against the declared schemas.

## Why now

This was the last `asap` item on the readiness bar. Graft already
claimed structured JSON output, but the contract was mostly implicit in
tests and implementation. That is too brittle for agents, wrappers,
and future refactors.

## Playback questions

1. Does every MCP response carry an explicit versioned schema marker?
2. Do the CLI commands (`init`, `index`) have machine-readable JSON
   modes with declared versioned schemas?
3. Is there one source of truth for these output contracts instead of
   scattered ad hoc assumptions?
4. Do tests validate real emitted payloads against the declared
   schemas?

## Scope

In scope:
- MCP output schema registry
- shared receipt schema declaration
- version marker on MCP responses
- JSON mode for `graft init` and `graft index`
- CLI output schema registry
- witness tests validating representative emitted payloads
- docs and invariants for the new contract

Out of scope:
- full CLI/MCP capability parity
- schema publication outside the repo
- breaking output redesigns unrelated to versioning

## Design

Create one shared output contract module that owns:
- schema ids
- schema versions
- zod output schemas
- JSON Schema export helpers

MCP responses should gain a top-level `_schema` block:
- `id: "graft.mcp.<tool>"`
- `version: "1.0.0"`

CLI JSON responses should do the same with:
- `id: "graft.cli.<command>"`
- `version: "1.0.0"`

CLI commands should keep human text output by default and add `--json`
for machine-readable automation.

Tests should validate representative emitted payloads against the
declared schemas, not only against ad hoc field assertions.

## Witnesses

- schema registry covers every registered MCP tool
- schema registry covers every CLI command with machine-readable output
- representative MCP responses validate against their declared schemas
- `graft init --json` validates against its declared schema
- `graft index --json` validates against its declared schema
