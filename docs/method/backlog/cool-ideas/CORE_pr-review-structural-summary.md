# PR review structural summary

Run graft_diff on a PR and produce a human-readable structural
summary: "This PR touches 12 files but only 3 have structural
changes. The rest are formatting/whitespace."

Helps reviewers focus attention where it matters. Could be a CLI
command (`graft review <PR#>`) or a GitHub Action that posts the
summary as a PR comment.

The diff summary lines feature (shipped in v0.3.0) is the primitive
this builds on.
