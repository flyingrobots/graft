---
title: "A lint for design-packet internal consistency"
feature: method-tooling
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-08-16
---

# A lint for design-packet internal consistency

## The observation

While repairing `CORE_first-retained-workspace-observation`, the most common
defect was not a wrong claim but **one section of the packet contradicting or
under-scoping another** after an edit landed in one place and not the others.
It recurred at least six times: the Hill demanding byte-identical output while
acceptance said raw equality was the wrong bar; playback questions and the test
strategy still describing the superseded comparison; the implementation
boundary naming three evidence counters when acceptance required seven; the
test strategy authorizing no step for three invariants acceptance required.

Every instance was mechanical — two lists that must agree had stopped agreeing.

## The idea

A structural lint over `docs/design/**`, limited to checks that hold regardless
of how the packet is worded:

1. **Invariant coverage** — every numbered invariant is referenced by at least
   one acceptance criterion and one test-strategy step.
2. **Counter closure** — the identifiers in the required-evidence block and the
   counters named in acceptance criteria are the same set. On this packet the
   two sets disagreed twice, once under two names for the same count.
3. **Reference resolution** — "see below" resolves in the stated direction, and
   every `src/...` path cited exists in the tree. The path check alone catches a
   packet that has gone stale against the tree.

## Scope note

Two further rules were drafted and rejected during review: an
equality-vocabulary check and a numbered-list integrity check. Both assert
document wording or formatting, which `AGENTS.md` prohibits, and the first
produced false positives on correct text in this very packet. They are recorded
here only so they are not re-proposed.

This is an idea, not a specification. Anything beyond the three checks above —
including whether the lint is worth building at all — is for the cycle that
picks it up.
