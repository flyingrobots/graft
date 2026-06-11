# Release Design: v0.9.0

## Included Work

- Establish canonical structural-history schema authority:
  `schemas/graft-structural-history.graphql` with Wesley-generated
  TypeScript contracts and a hermetic regenerate-and-diff gate
  (`pnpm schema:structural-history:check`), pinned to Wesley CLI 0.0.5.
- Add the structural-history Echo package descriptor with deterministic
  identities and a drift checker.
- Add explicit structural-reading evidence labels (`echo-native`,
  `git-warp-imported`, `fallback-translated`) behind the Graft-owned
  `StructuralReadingPort`, preserving public response shapes.
- Add the fake Echo-shaped TypeScript witness: the schema's first Intent
  (`recordGitWarpImportBatch`), Wesley LE-binary var codecs, the
  `EchoKernelTransport` byte seam, EINT v1 + canonical-CBOR envelope
  codecs, a typed structural-history client, an Echo-backed
  `StructuralReadingPort` adapter with the contract obstruction → posture
  mapping, and a deterministic fake transport mirroring Echo's wire-level
  authority enforcement. Guard tests keep the Echo stack out of
  production contexts.
- Add structural source span invariants to the canonical schema.
- Add MCP `workspace_open` / `workspace_list_opened` multi-worktree
  session surfaces.
- Add per-version path and line-range facts to `graft_blame` and
  `graft symbol history`.

## Deferred Work

- Slice 4: `StructuralReadingPort` generated-model parity (last
  Graft-only pre-Echo slice).
- Echo integration gate: real Echo runtime witness; envelope version
  decision (EINT v1 vs session-proto v2).
- Wesley observer-plan/zod emission and pipeline wiring; weslaw law
  document for structural history.
- Parser-readiness first-call defect on search surfaces
  (`CLEAN_code-show-parser-runtime-not-ready`, scope broadened during
  dogfooding).
- Cumulative `bytesAvoided` receipt aggregation defect.
- Moderate-severity dependency triage (4 Dependabot findings; below the
  release-blocking threshold per security policy).

## SemVer Posture

Minor, additive. The documented public API surface
(`src/api/index.ts`) is unchanged; new modules are internal and the new
MCP workspace surfaces are additive capability registry entries.
