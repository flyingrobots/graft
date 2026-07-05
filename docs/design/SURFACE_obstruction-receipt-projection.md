# SURFACE: Obstruction receipt projection preservation

## Hill

Graft can preserve an Edict-provided Echo obstruction receipt projection lane for
dirty `.edict` buffers without becoming an Echo runtime, Jim admission layer, or
semantic interpreter for obstruction reasons.

## Problem

Edict can project source text into syntax, diagnostics, Core, and Target IR
review artifacts. Echo can now execute an accepted obstruction-strand fixture
and produce a deterministic review receipt bound to the Target IR digest. The
editor bridge needs a place to carry that receipt forward without collapsing it
into existing projection meanings.

The dangerous shortcut would be to treat an obstructed receipt as a compiler
diagnostic, a hard rejection, or a scheduler counterfactual. Those facts remain
separate:

- Scheduler counterfactual: the candidate was not admitted and did not run.
- Obstructed strand: Echo ran an accepted artifact into an obstruction outcome.
- Hard rejection: a profile, validation, input, or runtime rule refused
  execution.

Graft's job in this slice is preservation. It displays and transports the
receipt shell. It does not decide what a domain-specific obstruction reason
means.

## Receipt Slot

Edict projection bundles gain an `echoReceipt` slot:

```ts
type EdictEchoReceiptProjection = {
  outcomeKind: string;
  targetIrDigest: string;
  targetIrDomain?: string;
  reasonKind?: string;
  reasonPayload?: Record<string, unknown>;
  receipt: Record<string, unknown>;
};
```

The slot uses the same projection-state envelope as Core and Target IR:

```ts
type ProjectionSlot<T> =
  | { state: "not_requested" }
  | { state: "available"; value: T }
  | { state: "blocked"; reason: Record<string, unknown>[] }
  | { state: "failed"; error: ProjectionFailure };
```

The decoder accepts future Edict JSONL records with schema
`edict.projection.echo-receipt/v1` and type `echoReceipt`.

Required available fields:

- `outcomeKind`
- `targetIrDigest`
- `receipt`

Optional available fields:

- `targetIrDomain`
- `reason.kind`
- `reason.payload`

`receipt` is preserved as an opaque review object. Graft may render it, but it
must not interpret nested Echo or Jim semantics.

## Receipt Digest Boundary

This slice does not freeze canonical Echo receipt bytes. Therefore the
projection record must not expose a top-level `receiptDigest`.

Graft rejects a top-level `receiptDigest` in `edict.projection.echo-receipt/v1`
records until a future Echo/Edict slice defines canonical receipt bytes and a
digest contract. Without canonical bytes, a digest-shaped field would be a false
authority claim.

## StructuredBuffer Behavior

`StructuredBuffer` preserves `echoReceipt` when an Edict provider returns it.
The default StructuredBuffer Edict request remains:

```ts
["syntax", "diagnostics", "core", "targetIr"]
```

That protects compatibility with current Edict CLI builds that do not emit
receipt projection records. Hosts that have a provider capable of attaching
receipt projections can return the slot without changing the default CLI bridge.

If an Edict provider explicitly returns `echoReceipt.state` as `blocked` or
`failed`, the buffer snapshot is partial, matching the existing Core and Target
IR slot behavior.

## Boundary

Graft may:

- preserve `outcomeKind`;
- preserve `targetIrDigest`;
- preserve `targetIrDomain`;
- preserve `reasonKind`;
- preserve `reasonPayload`;
- preserve the full opaque receipt review object;
- expose the receipt slot to editor hosts.

Graft must not:

- execute Echo;
- admit Jim artifacts;
- classify an obstructed receipt as a hard rejection;
- classify an obstructed receipt as a scheduler counterfactual;
- decide that `jim.EditObstruction.StaleBase` means stale basis in every
  domain;
- expose a receipt digest before canonical receipt bytes exist;
- claim settlement or reintegration authority.

## Playback Questions

- Does the Edict JSONL decoder preserve an `obstructed_strand` receipt as an
  explicit `echoReceipt` slot?
- Does Graft preserve the Target IR digest binding carried by the receipt?
- Does Graft preserve the reason kind and reason payload opaquely?
- Does Graft reject top-level `receiptDigest` before canonical receipt bytes
  exist?
- Does StructuredBuffer keep the default Edict CLI request compatible with
  existing syntax/Core/Target IR projection?
- Does StructuredBuffer preserve an injected receipt slot without
  reclassification?

## Non-goals

- No Echo execution.
- No Jim admission.
- No jedit UI.
- No canonical Echo receipt bytes.
- No receipt digest.
- No scheduler counterfactual explorer.
- No Continuum or XYPH settlement claim.
