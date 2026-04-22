---
title: "PR review structural summary"
feature: surface
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "graft_diff tool (shipped)"
  - "Diff summary lines (shipped)"
  - "Tree-sitter parsing (shipped)"
acceptance_criteria:
  - "A `graft review <PR#>` command or GitHub Action produces a human-readable structural summary of a PR"
  - "Summary distinguishes structural changes from formatting/whitespace-only changes"
  - "Summary reports file count, structural-change count, and per-file classification"
  - "When run as a GitHub Action, the summary is posted as a PR comment"
---

# PR review structural summary

Run graft_diff on a PR and produce a human-readable structural
summary: "This PR touches 12 files but only 3 have structural
changes. The rest are formatting/whitespace."

Helps reviewers focus attention where it matters. Could be a CLI
command (`graft review <PR#>`) or a GitHub Action that posts the
summary as a PR comment.

The diff summary lines feature (shipped in v0.3.0) is the primitive
this builds on.

## Implementation path

1. Fetch PR diff (via `gh pr diff` or GitHub API)
2. Run `graft_diff` on each changed file to classify changes
3. Aggregate: count structural vs non-structural changes per file
4. Produce summary with per-file classification
5. For GitHub Action: post as PR comment via API

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
