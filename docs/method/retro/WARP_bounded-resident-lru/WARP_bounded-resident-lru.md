---
title: "Bounded WARP resident LRU retro"
cycle: WARP_bounded-resident-lru
design_doc: docs/design/WARP_bounded-resident-lru.md
outcome: implementation-complete-validation-open
drift_check: yes
---

# Bounded WARP resident LRU retro

## Outcome

Implemented the finite resident pool and operation-scoped ownership on the
existing PR #251 branch, after merging current main in `0a3b8ad2`. No installed
daemon, package release, or live repository index was modified. The original
PR predates its design packet; this continuation wrote the replacement packet
before RED/GREEN and records that inherited process drift explicitly.

The default is four slots per pool, counting opening reservations. Bindings
retain identity without pinning graphs between operations. Idle entries are
reused and evicted by recency; all-pinned admission fails rather than growing.
Durable Git-backed reconstruction and ongoing invocation ownership remain.
This supersedes the original packet's binding pins and unconditional eager
eviction; an explicit zero-idle policy preserves the cold configuration.

## Evidence

See [verification](witness/verification.md). New semantic and generated cases,
real reconstruction, lifecycle regressions, and four deliberate mutations
support the implementation. A private copied checkpoint experiment plateaued
at two resident handles across twelve successive writer lanes.

The full isolated suite was attempted and failed: one superseded policy
expectation and five timeouts. The updated four affected files subsequently
passed 53/53 in isolation, without a global timeout change. This is diagnostic
evidence, not a waiver or a claim that the earlier full run passed. Merge
remains gated on final validation and substantive current-head review.

## Drift and test maintenance

Old cold-policy tests now pass explicit pool options so their ownership and
reconstruction counterexamples remain executed. Tests that assumed a binding
owned a pin now retain an explicit invocation when testing protection across
rebind/retirement. Expected membership and attribution remain unchanged.
The new default has independent named and generated tests; a generator did
not replace known counterexamples.

The new real transport scenario uses a declared 15-second integration budget.
Its earlier 5-second failure and a later host run reporting 1,064 seconds
against a 15-second timer remain in the witness. That elapsed-time anomaly
is not sufficient evidence to diagnose a daemon hang or machine suspension.

## Debt and boundaries

- Added [resident owner inventory](../../backlog/bad-code/WARP_resident-owner-inventory.md),
  explicitly deferring the old packet's detailed owner playback question.
- Added [memory beyond handle count](../../backlog/bad-code/WARP_resident-count-is-not-a-memory-budget.md).
- Existing [integration timing debt](../../backlog/bad-code/CLEAN_host-integration-timeout-obscures-warp-stage.md)
  remains relevant; expanded failure evidence is recorded below.
- Existing source/history currency debt remains separate. Cache recency and
  successful reconstruction do not establish current-source freshness.
- No new cool-ideas cards. No package split, byte-budget implementation,
  telemetry platform, or automatic restart was added.
