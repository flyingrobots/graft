---
title: "Wesley codec pipeline wiring and observer-plan generation for structural history"
feature: core
kind: architecture
legend: CORE
lane: cool-ideas
priority: 4
effort: M
status: open
reported: 2026-06-10
---

# Wesley codec pipeline wiring and observer-plan generation for structural history

## Context

Wesley 0.1.0 emits LE-binary TypeScript value codecs wire-compatible with Rust
`echo_wasm_abi::codec`, and Graft's release gate installs the declared
`wesley-cli` from crates.io. The fake Echo witness slice generates codecs for
Graft's structural-history schema as part of its build. What jedit has that
Graft still lacks after that slice:

- observer plans (`*.observer-plan.generated.ts`) giving bounded reads
  explicit aperture, basis, budgets, and rights;
- released Echo contract-host operation identity artifacts, so EINT `op_id`
  values are not copied into Graft witness code or inferred from value codecs;
- first-class codec emission in the recurring schema pipeline
  (`pnpm schema:structural-history:check` and the gen scripts), not just a
  one-time generation;
- zod schema emission (`host-node zod`) for runtime shape validation, which
  would also serve the descriptor-checker validation gap
  (`CLEAN_descriptor-checker-lacks-schema-validation`).

## Idea

Bring Graft's Wesley invocation to parity with jedit's generator matrix:
typescript operations, le-binary codecs, zod schemas, and observer plans, all
under the existing hermetic version/hash gate.

## Why it matters

Observer plans are how Echo bounds reads — Graft's read-governance story
should ride that mechanism, not bypass it. Codec identity belongs in the
contract package descriptor, which wants codecs to be a stable, gated
pipeline output.

## First step

Diff jedit's `scripts/run-wesley-tool.mjs` / `gen:contract:*` scripts against
Graft's `scripts/check-structural-history-schema-artifacts.ts` and list the
emitters Graft is not yet invoking.
