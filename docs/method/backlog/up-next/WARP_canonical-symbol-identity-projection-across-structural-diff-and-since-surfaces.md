---
title: "Canonical symbol identity projection across structural diff and since surfaces"
legend: WARP
lane: up-next
---

# Canonical symbol identity projection across structural diff and since surfaces

# Why

`0091` establishes canonical `sid:*` identity in WARP indexing and exposes it through indexed precision reads, but the structural diff/since family still speaks in address-level `sym:<path>:<name>` plus additive continuity hints. That remains honest, but it is not yet a canonical identity projection surface.

# Desired end state

- `graft_diff`, `graft_since`, and adjacent structural history surfaces can project canonical identity when WARP truth is available
- these surfaces remain explicit about certainty and do not collapse ambiguous continuity into fake canonical identity
- Level 1 address truth stays visible even when `identityId` is present

# Notes

This is a follow-on to `0091-canonical-symbol-identity-across-files-and-commits`, not a blocker for closing that slice.
