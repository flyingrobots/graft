---
title: "graft review PR-number adapter"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: M
requirements:
  - "graft review local-range first slice"
  - "GitHub transport decision"
  - "Bounded subprocess policy"
acceptance_criteria:
  - "`graft review <PR#>` resolves a pull request into an explicit base/head range without changing the review model"
  - "The adapter does not post comments or mutate remote state"
  - "Failures explain whether GitHub auth, remote shape, or missing refs blocked resolution"
  - "Tests cover missing GitHub tooling/auth without hanging"
---

# graft review PR-number adapter

The first `graft review` slice is intentionally repo-local:

```bash
graft review --base origin/main --head HEAD
```

That keeps the structural summary model independent from GitHub
transport. A later adapter can make the product spelling nicer by
resolving a PR number to a local base/head range.

## Sketch

Accept a positional PR number:

```bash
graft review 123
```

Resolve the PR through an explicit adapter, then call the existing
local-range review path. Candidate adapters include bounded `gh` calls or
Git remote refs, but the implementation should not make GitHub a hidden
dependency of the core review model.

## Non-Goals

- No GitHub comment posting.
- No merge-readiness verdict.
- No broad GitHub workflow client.
- No unbounded subprocess calls.
