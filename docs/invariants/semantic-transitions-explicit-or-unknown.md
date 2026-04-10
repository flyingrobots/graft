# Invariant: Semantic Transitions Are Explicit Or Unknown

**Status:** Planned
**Legend:** WARP

## What must remain true

Bounded semantic-transition surfaces must name a supported transition
meaning or explicitly remain `unknown`. They must not imply richer repo
meaning than the available evidence supports.

## Why it matters

Raw Git lifecycle events do not fully explain what kind of work is
happening. But overclaiming semantic meaning is worse than staying
unknown, because humans and agents will start making lifecycle and
provenance assumptions that the product cannot justify.

## How to check

- Supported semantic transition classes are documented and versioned
- Merge/rebase/conflict/index/bulk meanings only appear when the needed
  repo evidence is present
- Weak, mixed, or stale evidence downgrades the semantic meaning to
  `unknown`
- Bounded surfaces do not present semantic transition summaries as
  canonical provenance
