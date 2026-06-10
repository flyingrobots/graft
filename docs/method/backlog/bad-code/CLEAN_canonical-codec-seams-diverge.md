---
title: "Canonical JSON and canonical CBOR codecs have divergent seams"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 4
effort: M
status: open
reported: 2026-06-10
---

# Canonical JSON and canonical CBOR codecs have divergent seams

## Problem

`src/adapters/canonical-json.ts` (RFC 8785, recursive `sortDeep`) and
`src/echo/canonical-cbor.ts` (RFC 8949, inline encoded-key-byte sort) both
implement deterministic canonical encoding with sorted keys, with no shared
seam or cross-referencing tests.

## Risk

Determinism rules evolve in one codec without the other noticing. A future
"canonical bytes" guarantee that holds for JSON but not CBOR (or vice versa)
would corrupt hash-based identity comparisons across surfaces.

## Desired Outcome

Either a shared canonicalization seam (key-ordering contract used by both) or
a parity test asserting both codecs agree on key ordering for a common
fixture corpus.

## Acceptance Criteria

- A documented decision: shared seam or parity tests.
- At minimum, one test exercising both codecs over the same nested fixture.
