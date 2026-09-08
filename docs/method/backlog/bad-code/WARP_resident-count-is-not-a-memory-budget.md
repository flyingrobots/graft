---
title: "Bound single-graph materialization and worker memory"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 1
effort: L
status: open
reported: 2026-09-07
owner: flyingrobots
---

# Bound single-graph materialization and worker memory

## Problem and evidence

A finite resident count cannot bound the size of one WARP graph or total
process-tree memory. A controlled private copy of checkpoint
`714da101e689215e064d20f837b7d65be0fde9df`, frontier
`65125e836646b1952dd227f51f03970a1b9ab5d0`, contains 7,892 visible nodes,
19,645,828 state bytes, and 5,792,010 provenance bytes. On the installed
Graft 0.12.0 / git-warp 16 adapter, one retained queried handle occupied
102.51 MiB of post-GC heap and two occupied 180.19 MiB. Dropping the pool
returned heap to 18.62 MiB. A one-file observer incurred similar whole-graph
materialization. Open validation and the first query each decoded checkpoint
state. These samples do not identify the vanished 7 GB incident.

Local experiment artifacts: `/tmp/graft-memory-probe.bIuo8Y/REPORT.md` and
bounded child harness `run.py`; temporary files are not permanent receipts.
The LRU retro records the follow-up experiment and its limits.

## Bounded next delivery

Measure graph load amplification and retained native/JS memory separately.
Define an admission estimate or upstream bounded query/checkpoint capability
before claiming a byte limit. Account for worker processes and concurrent
transient decode allocations. Preserve durable graph semantics, include
oversize/admission failure behavior, and use owned copied fixtures with
process/time ceilings. Do not turn a count limit into an RSS promise or
force GC in production. Package separation alone does not remove allocation.
