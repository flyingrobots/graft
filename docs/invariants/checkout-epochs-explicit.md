# Invariant: Checkout Epochs Are Explicit

**Status:** Planned
**Legend:** WARP

## What must remain true

Branch switches, merges, rewrites, and other history-shaping Git
transitions must create explicit checkout-epoch boundaries for workspace
overlay and strand interpretation.

## Why it matters

If one causal workspace silently spans incompatible branch or history
bases, provenance becomes smeared across contexts that should have been
distinguished. Between-commit history then stops being trustworthy.

## How to check

- `post-checkout`, `post-merge`, `post-rewrite`, or an equivalent
  explicit transition source informs checkout-epoch changes
- Workspace overlay state is anchored to a checkout epoch
- Strand/session interpretation names when a causal workspace parks,
  forks, or transitions across epochs

