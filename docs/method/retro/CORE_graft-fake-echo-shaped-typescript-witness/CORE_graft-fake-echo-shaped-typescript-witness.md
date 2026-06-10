---
title: "Graft fake Echo-shaped TypeScript witness"
cycle: "CORE_graft-fake-echo-shaped-typescript-witness"
design_doc: "docs/design/CORE_graft-fake-echo-shaped-typescript-witness.md"
outcome: hill-met
drift_check: yes
---

# Graft Fake Echo-Shaped TypeScript Witness Retro

## Summary

The slice shipped as PR #86 and landed on `main` in merge commit
`fab5d0119af174297e7589f337b8941546c69f0e`.

Graft now proves its Echo-facing TypeScript seam end to end without a real
Echo runtime: the canonical schema's first Intent
(`recordGitWarpImportBatch`), Wesley 0.0.5 LE-binary var codecs, a
three-method `EchoKernelTransport` byte seam, EINT v1 + canonical-CBOR
envelope codecs, a typed structural-history client carrying Echo's exact
`IntentOutcome` kinds, and an Echo-backed `StructuralReadingPort` adapter
mapping `ContractObstructionKind` into Graft freshness/residual posture —
all exercised through a deterministic fake transport that mirrors Echo's
wire-level authority enforcement. The Echo adapter is barred from production
contexts by a guard test; no public surface changed and no durability claim
was made.

## Playback Witness

Artifacts under
`docs/method/retro/CORE_graft-fake-echo-shaped-typescript-witness/witness`.
Playback answers are recorded in the design packet.

## Drift Check

`method_drift` reported no playback-question drift:

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 306 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.
```

## What surprised you?

1. **The docs were not the contract.** The first packet draft was inferred
   from a consumer (jedit) and was wrong three ways; Echo's own quickstart,
   SPEC-0009, and `contract_obstruction.rs` corrected the obstruction
   taxonomy, the envelope layers (EINT v1 vs session-proto v2 — a spec gap
   now fixed upstream in echo#534), and the authority-boundary nouns.
   Validating docs against live source is now standing doctrine.
2. **The toolchain already had the hard parts.** Wesley 0.0.5 (Graft's
   eventual pin) shipped the LE-binary emitter; no hand-rolled codec was
   ever needed. The witness's only bespoke wire code is the envelope layer
   the spec defines.
3. **Review bots found real P2s post-GREEN**: file-path disambiguation for
   same-named symbols, silent acceptance of readings-free responses, the
   generated decoder's trailing-byte tolerance (Wesley emitter gap, filed as
   wesley#603), and basis-blind fixtures. All fixed with regression tests
   in `test/unit/echo/wire-strictness.test.ts`.

## What would you do differently?

Read the runtime's authoritative contract surface before designing against
consumer examples, and pin CI toolchain bumps (Wesley 0.0.4 → 0.0.5) in the
same commit as the manifest bump — the version-gate CI failure was
self-inflicted and cost one round trip.

## Follow-on work filed

- `CLEAN_canonical-codec-seams-diverge` (bad-code)
- `CLEAN_sha256-stable-id-helper-duplication` (bad-code)
- `CLEAN_echo-witness-test-fixture-duplication` (bad-code)
- `CORE_wesley-codec-and-observer-plan-generation-for-structural-history`
  (cool-ideas)
- `CORE_weslaw-semantic-law-for-structural-history` (cool-ideas)
- flyingrobots/wesley#603 (emitter trailing-byte strictness)
- flyingrobots/echo#535 (design-doc tome consolidation)
