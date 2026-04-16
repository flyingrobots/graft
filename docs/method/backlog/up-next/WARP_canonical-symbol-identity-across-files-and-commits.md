---
title: "Canonical symbol identity across files and commits"
legend: WARP
lane: up-next
---

# Canonical symbol identity across files and commits

The 0090 continuity slice now emits explicit likely rename continuity for same-file structural diffs, but Graft still does not have canonical symbol identity that survives cross-file moves, commit-to-commit evolution, or provenance-bearing continuity beyond address-level `sym:<path>:<name>` plus additive hints.

Desired next shape:
- define canonical symbol identity beyond address and likely rename continuity
- carry identity across file moves and commit boundaries
- make confidence / certainty posture explicit where identity is ambiguous
- project that identity into diff, since, and precision surfaces without pretending Level 1 addresses are stable identity
