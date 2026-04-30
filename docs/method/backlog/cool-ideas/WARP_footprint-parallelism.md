---
title: "Footprint-based parallelism"
feature: projection
kind: leaf
legend: WARP
lane: cool-ideas
effort: XL
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Cross-file reference edges (shipped)"
  - "Footprint declarations per tool call (backlog)"
  - "WARP optics (backlog)"
acceptance_criteria:
  - "Given two tool calls with non-overlapping symbol footprints, the system identifies them as parallelizable"
  - "Given two tool calls with overlapping symbol footprints, the system correctly rejects parallel execution"
  - "Parallelism decisions are derived solely from structural footprint analysis, not programmer annotations"
  - "A set of N refactor operations is partitioned into maximal parallelizable groups with no false positives"
  - "False negatives (conservative rejections) are acceptable; false positives (unsafe parallelism) are not"
---

# Footprint-based parallelism

Two code_show calls on non-overlapping symbols have non-overlapping
footprints. They're composable — can run in parallel without
coordination. The system knows this from the footprint structure,
not from the programmer.

"These 5 refactors can all proceed in parallel because their
footprints are disjoint." The WARP admission rule:
non-overlapping footprints are admissible together.

This is automatic parallelism discovery from structural analysis.
No locks, no coordination, no programmer annotation. The geometry
determines independence.

See: aion-paper-07/optics/warp-optic.tex (Section 8)

## Implementation path

1. Define the footprint model: for each tool call (read or write),
   compute the set of symbols and files it touches. Read footprints
   are the symbols/files returned. Write footprints are the symbols/
   files modified.
2. Build footprint extraction: instrument each MCP tool to declare
   its footprint. For reads (code_show, file_outline, safe_read),
   the footprint is the symbol set returned. For writes (edit
   operations), the footprint is the symbol set modified plus
   transitive dependents from reference edges.
3. Implement the overlap checker: given two footprints, determine
   if they overlap. Overlap means any shared symbol in the write
   set of one footprint intersects with either set of the other.
   Two read-only footprints never conflict.
4. Build the parallelism partitioner: given N pending operations,
   compute the maximal set of parallelizable groups using the
   overlap checker. This is a graph coloring problem on the
   conflict graph.
5. Integrate with multi-agent coordination: when multiple agents
   propose operations, the partitioner determines which can proceed
   in parallel. Operations with overlapping footprints are
   serialized.
6. Validate with conservative semantics: false negatives (rejecting
   safe parallelism) are acceptable for safety. False positives
   (allowing unsafe parallelism) must be zero.

## Related cards

- **WARP_shadow-structural-workspaces**: Shadow workspaces give
  each agent an isolated structural view. Footprint parallelism
  determines whether isolation is necessary. They compose:
  footprint analysis could determine that two agents' workspaces
  are disjoint and can collapse without conflict. However, neither
  requires the other — shadow workspaces use full isolation
  regardless of footprints, and footprint parallelism works without
  workspaces (it partitions operations, not agents). Not a hard
  dependency.
- **CORE_multi-agent-conflict-detection**: Conflict detection
  notifies agents when their contexts overlap. Footprint parallelism
  determines whether operations can run concurrently. Conflict
  detection is reactive (detects after the fact); footprint
  parallelism is proactive (prevents conflicts). Not a hard
  dependency — different time horizons and mechanisms.
- **WARP_speculative-merge**: Speculative merge forks the worldline
  to test a merge. Footprint parallelism determines if the fork is
  necessary (disjoint footprints don't need speculative merge).
  Complementary but independent.
- **CLEAN_CODE_parallel-agent-merge-shared-file-loss**: The merge
  loss problem occurs when parallel agents modify shared files.
  Footprint analysis could prevent this by rejecting parallelism
  on overlapping files. Complementary solutions at different layers.

## No dependency edges

The two unshipped requirements (WARP optics, footprint declarations)
are internal to this card's implementation — they describe new
concepts that must be designed and built as part of this feature,
not separate cards that must ship first. WARP optics is a theoretical
framework from the AION papers that would need to be operationalized
here. Footprint declarations are a per-tool annotation that would
be added as part of the instrumentation step. No existing backlog
card provides either of these as a prerequisite.

## Effort rationale

XL. This is a deep systems feature requiring: (a) a new footprint
model with formal correctness properties (no false positives),
(b) instrumentation of every MCP tool to declare footprints,
(c) transitive dependency analysis via reference edges to compute
write blast radii, (d) a graph coloring partitioner, and (e)
integration with multi-agent coordination. The WARP optics
framework from the AION papers has not been operationalized yet —
translating the theoretical model into practical footprint
computation is significant design work. The correctness bar is
very high (unsafe parallelism causes data loss), which requires
extensive adversarial testing.
