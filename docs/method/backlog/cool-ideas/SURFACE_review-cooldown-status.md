---
title: "Review cooldown status helper"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: S
requirements:
  - "PR conversation comment reads"
  - "Local timezone rendering"
  - "CodeRabbit review-rate-limit marker parsing"
acceptance_criteria:
  - "A command detects CodeRabbit review rate-limit comments on a PR"
  - "The command prints the local processing timestamp and calculated cooldown expiry"
  - "The command degrades to `ready` when no cooldown marker is present or the window has expired"
---

# Review cooldown status helper

PR feedback loops often depend on whether an automated reviewer is ready
for another pass. Today that requires manually reading the latest PR
comment, parsing the review-rate-limit marker, and calculating the
cooldown in local time.

A helper could answer that directly: ready, cooling down, or unknown,
with the relevant timestamps printed in the operator's local timezone.

## Why this matters

The merge decision should not depend on stale or guessed reviewer state.
Making the cooldown calculation explicit would make the final "request
another review or wait" decision easier to audit.
