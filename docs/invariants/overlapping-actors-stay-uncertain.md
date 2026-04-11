# Invariant: Overlapping Actors Stay Uncertain

**Status:** Planned
**Legend:** WARP

## What must remain true

When multiple actors overlap in the same live worktree without explicit
handoff evidence, Graft must not present clean single-actor ownership or
single-actor provenance confidence.

## Why it matters

Same-repo and same-worktree concurrency are product reality before
multi-writer WARP semantics are real. If Graft quietly collapses
overlapping actors into one neat ownership story, humans and agents
will trust provenance that the product has not lawfully earned.

## How to check

- bounded surfaces distinguish shared repo scope from shared worktree
  scope
- same-worktree overlap can downgrade to `shared`,
  `overlapping_actors`, or `unknown`
- explicit attach / handoff evidence is required before stronger
  continuity claims are made
- docs and runtime surfaces do not imply multi-writer safety or clean
  ownership under overlap
