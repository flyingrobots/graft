---
title: "PR feedback resolution ledger"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "GitHub CLI or connector access"
  - "Review-thread resolution state"
  - "Local git commit metadata"
acceptance_criteria:
  - "A command lists unresolved PR review threads grouped by file and severity"
  - "After local commits, the command maps each addressed thread to one or more SHAs"
  - "The command can render a markdown summary table for PR comments without mutating GitHub by default"
---

# PR feedback resolution ledger

Review feedback processing currently requires stitching together
`gh pr view`, review bodies, GraphQL review-thread state, local commits,
and final PR comments by hand.

A small Graft-facing surface could turn that into a review ledger:
unresolved issue, file anchor, chosen resolution, supporting commit SHA,
and reply status. It should render the final markdown table locally first
and only post to GitHub through an explicit confirmation or flag.

## Why this matters

The review process asks for evidence. A ledger would keep that evidence
inspectable before any network write, and would reduce the chance that a
fixed thread is left without a matching PR reply.
