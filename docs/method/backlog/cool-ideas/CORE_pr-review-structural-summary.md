---
title: "PR review structural summary"
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
