---
title: "Expose bounded WARP resident owner evidence"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-09-07
owner: flyingrobots
---

# Expose bounded WARP resident owner evidence

## Problem

PR #251 separates repository and resident counts but cannot answer which
operation owns a pinned graph. The pool retains owner metadata for capability
accounting; current health exposes only totals. A total is not an owner
inventory. This explicitly defers the original lease packet's human owner
playback question and PR review finding on `daemon-server.ts`.

## Bounded next delivery

Project authoritative pool ownership through the dedicated observational
same-user inspector contract. Bound query work, records, and bytes; preserve
capture scope and truncation. Distinguish idle, opening, and pinned residents,
worktree construction evidence, and originating operation/session identities.
Inspection must not acquire a graph, touch recency, renew workload leases, or
expose identities as metric labels. Test prohibited effects and partial-result
semantics. No new registry, HTTP listener, or lifecycle control surface.

## Until implemented

Label existing `activeWarpRepos` and `activeWarpResidents` as aggregate pool
counts including idle/opening entries. Do not claim operator ownership
playback is complete. This inspector delivery is outside the LRU merge scope.
