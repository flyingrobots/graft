# v0.9.0 Scope Decision

Status: release prep
Date: 2026-06-10

## Current State

- `v0.8.0` shipped the Review Truth release: structural review
  summaries, bounded symbol history, removed-symbol evidence, and wider
  parser-backed language coverage.
- Since then, main accumulated the schema-first Echo migration
  foundation: schema authority with a hermetic Wesley gate, the Echo
  package descriptor, evidence-label alignment, and the fake Echo-shaped
  TypeScript witness (slices 1–3 of the locked pre-Echo plan), plus the
  MCP multi-worktree workspace surfaces and symbol-history location
  facts.

## Decision

Cut v0.9.0 now, before pulling slice 4
(`CORE_structural-reading-port-generated-model-parity`). The three
shipped slices form a coherent, fully-retro'd unit — "Graft's side of
the Echo contract is proven" — and releasing here keeps the next slice's
parity work against a tagged baseline.

## Out of Scope

- Any Echo runtime dependency or `echo-native` durability claim.
- Public API surface changes (none occurred; the witness stack is
  internal by design and guard-tested out of production contexts).
