---
title: "PR review structural summary"
feature: surface
kind: leaf
legend: CORE
lane: v0.8.0
priority: 1
effort: M
requirements:
  - "graft_diff tool (shipped)"
  - "Diff summary lines (shipped)"
  - "Tree-sitter parsing (shipped)"
acceptance_criteria:
  - "A `graft review <PR#>` CLI command produces a human-readable structural summary of a PR"
  - "A library/model boundary can produce the same summary without GitHub transport"
  - "Summary distinguishes structural changes from formatting/whitespace-only changes"
  - "Summary reports file count, structural-change count, and per-file classification"
  - "GitHub Action posting is explicitly deferred from the first slice"
---

# PR review structural summary

Run graft_diff on a PR and produce a human-readable structural
summary: "This PR touches 12 files but only 3 have structural
changes. The rest are formatting/whitespace."

Helps reviewers focus attention where it matters. Could be a CLI
command (`graft review <PR#>`) backed by a small summary model. A GitHub
Action that posts the summary as a PR comment is deferred until the core
summary boundary is boring and tested.

The diff summary lines feature (shipped in v0.3.0) is the primitive
this builds on.

## Implementation path

1. Model the review input as changed-file records from a PR diff or
   local diff adapter.
2. Run `graft_diff` on each changed file to classify changes.
3. Aggregate structural vs non-structural changes per file.
4. Produce a human-readable summary with per-file classification.
5. Keep GitHub Action posting out of the first slice.

## Related cards

- **CORE_structural-test-coverage-map**: Both are review helpers.
  Coverage map answers "what's tested?"; this card answers "what
  changed structurally?" Independent — could be combined in review
  workflows but neither requires the other.
- **WARP_auto-breaking-change-detection**: Could enhance PR
  summaries with breaking-change annotations, but that's a future
  enrichment, not a prerequisite.

## Effort rationale

Medium. The core logic (classify changes via graft_diff) is
straightforward. The GitHub Action layer adds deployment and
authentication concerns. The summary format needs design to be
genuinely useful without being noisy.

## No dependency edges

This card is genuinely standalone. All prerequisites are shipped,
and no other card requires this as a prerequisite. It consumes
existing primitives and produces a new surface.
