---
title: "Committed reference scans repeat repository analysis"
area: WARP
source_cycle: "WARP_cross-language-qualified-reference-resolution"
---

# Committed reference scans repeat repository analysis

## Problem

The ref-pinned scanner now shares one immutable analysis across every changed
symbol in a review. However, each supported source blob is still read through a
separate Git process, and diagnostic/review analysis remains sequential.
Correctness is bounded by the tracked source tree rather than WARP index size,
but process overhead and latency still scale linearly with repository size.

On the Graft repository witness (`1498` tracked files, `598` supported source
files), `graft struct import-diagnostics --ref HEAD --json` took about
`21` seconds after removing redundant per-file ref/object probes.

## Hill

Read committed blobs with bounded concurrency or batching while preserving the
single immutable analysis per review/diagnostic operation, exact-ref semantics,
and the bounded WARP index policy.

## Acceptance Criteria

- [x] One review with multiple breaking symbols reads and parses each relevant
  source blob at most once.
- Git blob reads use a bounded batch or bounded-concurrency mechanism.
- Diagnostic ordering and review counts remain deterministic.
- Dirty working-tree files cannot affect a ref-pinned result.
- Memory and process concurrency have explicit repository-size guardrails.

## Non-Goals

- Expanding the bounded WARP indexing policy.
- Persisting a second unbounded repository graph.
- Adding type checking, flow inference, or third-party dependency analysis.

## Landed

- Review and diagnostic callers can build one committed-analysis session and
  answer multiple symbol queries without additional Git reads or parsing.
