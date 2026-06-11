# Align structural-history evidence with Continuum's multidimensional EvidencePosture

## Context

The Continuum Compendium V1
(`continuum/docs/design/0031-continuum-compendium-v1/README.md`, Decision 5)
makes evidence posture **mandatory and multidimensional**:

```graphql
type EvidencePosture {
  origin: EvidenceOrigin!            # CONTINUUM_NATIVE | TRANSLATED_SUBSTRATE | FIXTURE | DESCRIPTOR | SYNTHETIC
  proofStrength: EvidenceProofStrength!  # WITNESSED | DIGEST_ONLY | CLAIMED | NONE
  access: EvidenceAccessPosture!
  completeness: EvidenceCompleteness!
  nativeContinuumWitness: Boolean!
  ...
}
```

Graft's `graft-structural-history` v0.1 schema carries a *flat* posture:
`StructuralEvidenceKind` (ECHO_NATIVE | GIT_WARP_IMPORTED |
FALLBACK_TRANSLATED) + `nativeContinuumWitness: Boolean` + `parity`. That
collapses origin and proof strength into one enum — exactly the "ambiguous
status strings" the compendium warns against.

The mapping is clean when we want it:

- `ECHO_NATIVE` → origin `CONTINUUM_NATIVE`
- `GIT_WARP_IMPORTED` / `FALLBACK_TRANSLATED` → origin `TRANSLATED_SUBSTRATE`
- slice 4's sha256 payload digests → proofStrength `DIGEST_ONLY`
- a future witnessed-suffix relay → proofStrength `WITNESSED`
- port `residualPosture` ≈ completeness (PARTIAL/RESIDUAL/OBSTRUCTED overlap)

`nativeContinuumWitness` is already shared verbatim — graft's invariant
`fallback_translated_is_not_native_continuum` and the slice 4
`ECHO_NATIVE_REFUSED` typed refusal implement the compendium's "Fake Interop"
mitigation ("translated evidence must be labeled translated") today.

## Desired outcome

When graft moves toward Continuum Tier 2 (Observable: `participant.hello` +
`contract.index` + `observation.v1`), evolve the structural-history schema's
evidence model toward the EvidencePosture dimensions instead of widening the
flat enum, and map the generated bundle into a `ReadingEnvelope`. The
compendium's Cut 4 explicitly names a "Graft-style structural observer
example" as proof surface — graft's slice 4 mapping is the natural input.

## Origin

Reading the Continuum Compendium V1 at James's request, 2026-06-11.
