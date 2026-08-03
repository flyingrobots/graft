---
title: "Cross-language qualified reference resolution"
cycle: "WARP_cross-language-qualified-reference-resolution"
design_doc: "docs/design/WARP_cross-language-qualified-reference-resolution.md"
outcome: hill-met
drift_check: yes
---

# Cross-language qualified reference resolution Retro

## Summary

The hill is met. Structural review can count committed first-party qualified
callers at the exact reviewed ref without expanding the bounded WARP indexing
policy. Python, TypeScript, TSX, JavaScript, Rust, and Go now share one
qualified-reference analysis contract, and lexical shadows suppress only the
symbol edges that cannot be inferred confidently.

Review results distinguish complete counts from partial counts and include only
the shadow warnings relevant to the changed symbol. Repository-wide shadow
diagnostics are available through both MCP and CLI surfaces.

## What Shipped

- Added a ref-pinned committed-reference scan shared with WARP's qualified
  reference indexing pass.
- Added Python module/package-child, TypeScript-family namespace, Rust module,
  and Go package-member resolution.
- Added Go module-coordinate, declared-package-name, exported-declaration, and
  ambiguous-declaration checks.
- Added language-correct lexical shadow regions for parameters, locals,
  assignments, declarations, loops/ranges, catches, comprehensions, and Rust
  patterns.
- Preserved import-level file evidence when a shadow suppresses a qualified
  symbol edge.
- Added `referenceWarnings` and `referenceConfidence` to breaking changes and
  exposed them in JSON and human review output.
- Added `graft_import_diagnostics` and
  `graft struct import-diagnostics [--ref <ref>] [--json]`, including schema,
  capability, generated-model, and documentation parity.
- Preserved the bounded lazy-index policy and the byte-identical existing
  TypeScript import resolver fixture.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- The current SalesOS `feature/dev-profiler` branch loads matcher sources
  through `_load_sources()`. That interprocedural alias is intentionally outside
  this cycle's inference model, so the disposable witness reports partial
  confidence rather than inventing a caller edge.
- Direct qualified `sources.pending_ids` behavior is covered by the cold-WARP
  review fixture at the planned `coqui/matcher/cli.py` path.

## New Debt

- [Committed reference scans repeat repository analysis](../../backlog/bad-code/committed-reference-scan-repeats-repository-analysis.md)

## Cool Ideas

- None recorded.
