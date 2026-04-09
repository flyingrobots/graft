# Invariant: Causal Collapse Is Slice-Based

**Status:** Planned
**Legend:** WARP

## What must remain true

Collapse checkpoints must admit the causal slice relevant to the target
footprint, not the entire strand by default.

## Why it matters

A session may touch many files and symbols, but only a subset may be
staged or committed. If collapse admits the whole strand, canonical
history gains unrelated noise. If collapse discards the strand, the
system loses the explanation for why the admitted structural change
happened.

## How to check

- Collapse targets have an explicit footprint (staged file set, symbol
  set, or later a finer region)
- The admitted result references only the relevant strand activity
- Raw strand history remains inspectable after collapse
- Shared events may be referenced by multiple collapse projections
  without destructive migration

