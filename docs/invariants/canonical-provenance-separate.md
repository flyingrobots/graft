# Invariant: Canonical Structural Truth Is Not Canonical Provenance

**Status:** Planned
**Legend:** WARP

## What must remain true

Canonical structural truth and canonical provenance are related but not
identical graph layers.

Structural truth answers what the code means structurally over time.
Canonical provenance answers why later structural changes happened.

## Why it matters

If transient reads, searches, and intermediate actions are collapsed
into structural truth as if they were structural facts, the worldline
becomes noisy and dishonest. If provenance is discarded entirely, Graft
loses the between-commit explanation that makes the product more than
AST diffs.

## How to check

- Structural nodes/edges and provenance nodes/edges have an explicit
  ontology boundary
- Reads/searches/observations are not emitted as structural facts
- Collapse can admit provenance without pretending every causal event is
  canonical structural state

