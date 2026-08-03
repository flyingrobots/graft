---
title: "Committed reference scans repeat repository analysis"
area: WARP
source_cycle: "WARP_cross-language-qualified-reference-resolution"
---

# Committed reference scans repeat repository analysis

## Problem

The ref-pinned scanner reparses the repository for each changed symbol. The
dedicated diagnostic command also reads each supported source blob through a
separate Git process. Correctness is bounded by the tracked source tree rather
than WARP index size, but reviews with several breaking symbols repeat the same
blob reads, parsing, import resolution, and shadow analysis.

On the Graft repository witness (`1498` tracked files, `598` supported source
files), `graft struct import-diagnostics --ref HEAD --json` took about
`21` seconds after removing redundant per-file ref/object probes.

## Hill

Analyze a committed ref once per review/diagnostic operation and answer all
target-symbol queries from that immutable analysis without changing exact-ref
semantics or forcing a whole-repository WARP index.

## Acceptance Criteria

- One review with multiple breaking symbols reads and parses each relevant
  source blob at most once.
- Git blob reads use a bounded batch or bounded-concurrency mechanism.
- Diagnostic ordering and review counts remain deterministic.
- Dirty working-tree files cannot affect a ref-pinned result.
- Memory and process concurrency have explicit repository-size guardrails.

## Non-Goals

- Expanding the bounded WARP indexing policy.
- Persisting a second unbounded repository graph.
- Adding type checking, flow inference, or third-party dependency analysis.
