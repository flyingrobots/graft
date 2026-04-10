# Invariant: Persisted Local History Remains Artifact History Until Collapse

**Status:** Planned
**Legend:** WARP

## What must remain true

Persisted sub-commit local history may survive across reconnects,
handoffs, and checkout-aware continuity decisions, but it remains
explicitly `artifact_history` until a later collapse witness admits a
slice of it into canonical provenance.

## Why it matters

If persisted local history is presented as if it were already canonical
provenance, Graft overclaims what it knows and confuses raw between-
commit context with witness-backed explanation.

If persisted local history is treated as disposable runtime residue,
Graft loses the meaningful chain of activity that makes later causal
reasoning and staged-target explanation possible.

## How to check

- Persisted local-history surfaces are labeled as `artifact_history`
- Persisted local-history records can exist without any collapse witness
- Collapse admits a slice from local history into canonical provenance
  without mutating the raw local-history record stream into a different
  truth class
