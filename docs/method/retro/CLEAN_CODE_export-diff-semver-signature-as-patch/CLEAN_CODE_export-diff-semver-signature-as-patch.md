---
title: "export-surface-diff semver signature classification"
cycle: "CLEAN_CODE_export-diff-semver-signature-as-patch"
design_doc: "docs/design/WARP_export-surface-diff.md"
source_backlog: "docs/method/backlog/graveyard/CLEAN_CODE_export-diff-semver-signature-as-patch.md"
outcome: hill-met
drift_check: yes
---

# export-surface-diff semver signature classification Retro

## Summary

The hill was met. `exportSurfaceDiff` no longer classifies every
exported signature change as `patch`.

The shipped classifier parses exported function signatures and applies
conservative release semantics:

- required parameter additions are `major`
- removed parameters are `major`
- parameter type changes are `major`
- return type changes are `major`
- additive optional parameters are `minor`
- compatible text-only signature changes are `patch`

## What Shipped

- `deriveSemverImpact` now uses per-signature impact classification
  rather than treating the existence of any changed signature as
  `patch`.
- Signature parsing handles top-level parameter lists with nested type
  syntax so object/function/generic parameter types are not split on
  internal commas.
- Unit coverage now proves required parameter additions, optional
  parameter additions, optional parameter removals, parameter type
  changes, return type changes, and parameter rename-only changes.
- The v0.7.0 backlog card moved to graveyard with a resolved status.
- The original export-surface design gap now records the resolved
  classifier behavior.

## Validation

- `git diff --check`
- `pnpm lint`
- `pnpm vitest run test/unit/operations/export-surface-diff.test.ts`
- `pnpm test`

## Follow-On Pressure

The classifier is intentionally conservative. Full type compatibility
analysis still belongs to future semantic/LSP work, especially for
distinguishing safe return-type widening from breaking changes.
