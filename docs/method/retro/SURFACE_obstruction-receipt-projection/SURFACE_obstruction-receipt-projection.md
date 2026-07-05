---
title: "SURFACE: Obstruction receipt projection preservation"
cycle: "SURFACE_obstruction-receipt-projection"
design_doc: "docs/design/SURFACE_obstruction-receipt-projection.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Obstruction receipt projection preservation Retro

## Summary

Added an explicit `echoReceipt` slot to Edict projection bundles so Graft can
preserve future Echo obstruction receipt review payloads without interpreting
their domain meaning. The decoder accepts `edict.projection.echo-receipt/v1`
records, preserves outcome kind, Target IR digest, optional Target IR domain,
reason kind, reason payload, and the opaque receipt object, and rejects
top-level `receiptDigest` until canonical Echo receipt bytes exist.

`StructuredBuffer` preserves injected receipt slots and marks the snapshot
partial when a provider explicitly returns a blocked or failed receipt slot.
The default Edict CLI request remains syntax, diagnostics, Core, and Target IR
only, so current Edict projection providers remain compatible.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_obstruction-receipt-projection/witness`.

## What surprised you?

The change stayed smaller than expected because Edict projection already had
strict slot-state handling. The main design risk was not implementation size;
it was overclaiming by exposing a receipt digest before receipt bytes are
canonical.

## What would you do differently?

Add the receipt slot only after the Echo receipt bridge exists, as this slice
did. Trying to model the editor lane before Echo had an actual review receipt
would have encouraged speculative UI semantics.

## Follow-up items

- Add jedit display for the opaque `echoReceipt` lane.
- Add canonical Echo receipt bytes and receipt digests only in a future
  Echo/Edict slice that freezes those bytes.
- Keep scheduler counterfactual exploration separate from admitted obstruction
  receipt display.
