# Reverse id-content binding for generated-model structural readings

## Context

`fromGeneratedStructuralReading` (slice 4,
`src/echo/structural-reading-generated-model.ts`) verifies payload
integrity (`payloadDigest` recomputed from `payloadJson`) and pair linkage
(reading/evidence ids reference each other), but does **not** re-derive
`evidenceId`/`basisId` from the evidence summary facts. A
tampered-but-well-formed `evidence.summary` (different projectRoot, ref,
head) passes every gate and reconstructs a port result whose provenance no
longer matches what the ids hash-committed to at forward-mapping time.

## Why deferred, not fixed in slice 4

Enforcing id re-derivation on the reverse path binds the reverse mapping to
*this module's* id-derivation scheme. Future producers (Echo-native import
batches, design packet open question 2) may assign ids differently —
refusing their well-formed rows would be over-strict. The right contract
(ids are always re-derivable vs. ids are opaque references) is a decision
for the import-batch slice, where the producer side gets built.

## Desired outcome

When the import-batch builder lands, decide: either (a) ratify the
derivation scheme as the contract and add reverse-path id verification
(typed `ID_CONTENT_MISMATCH` obstruction), or (b) document ids as opaque
and move tamper-evidence to a batch-level digest/witness. Either way, the
asymmetry stops being implicit.

## Origin

Self-review finding (correctness angle C6) during slice 4 cycle, 2026-06-11.
