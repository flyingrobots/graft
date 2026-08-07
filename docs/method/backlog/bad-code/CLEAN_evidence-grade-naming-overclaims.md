---
title: "Three surfaces are named as evidence but carry none"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-08-02
---

# Three surfaces are named as evidence but carry none

## Problem

Graft sits next to Echo, which has real receipts, real bases, and real replay.
Three Graft surfaces borrow that vocabulary without the substance:

- `hashContent` is a 32-bit FNV-style hash over UTF-16 code units. Adequate as
  an opportunistic cache fingerprint; a collision makes changed content look
  unchanged, so it cannot support an "unchanged" or replay claim.
- `deterministic-replay.ts` compares fixtures with order-sensitive
  `JSON.stringify` over a partial filesystem double. It has no production
  importer. It is a fixture comparator, not causal replay.
- The MCP receipt carries wall-clock time, latency, and session counters. That
  is useful operational telemetry with no causal basis or admitted material
  identity.

## Risk

Naming is how a reader decides how much to trust something. Inside a codebase
whose neighbouring system has actual Echo receipts, an unqualified "receipt" or
"deterministic replay" invites someone to cite it as evidence that Graft has
replay. It does not.

## Repair sketch

Rename to what they are — `cacheFingerprint`, a fixture-comparison helper, and
something like `SessionLocalToolReceipt` or an explicit
`evidencePosture: "session_telemetry_only"` field. Where an evidence-grade
answer is genuinely wanted, key it by `(basisDigest, path, byteDigest)` over a
real digest rather than strengthening the fingerprint in place.
