# Invariant: Single Writer Is Honest

**Status:** Enforced (documentation)
**Legend:** WARP

## What must remain true

Each Level 1 sidecar operates under one logical structural-writer lane. Code
and documentation must not imply cross-sidecar or multi-writer merge semantics.

## Why it matters

git-warp supports multi-writer CRDT semantics, but Graft does not use that as a
product-level merge contract. Daemon sessions, persistent monitors, and the
CLI receive distinct logical writer identities and normally persist into
distinct actor sidecars. That separation prevents accidental graph sharing; it
does not merge concurrent actor histories or prove ownership of live files.

## How to check

- one complete repository, worktree, and actor identity selects one sidecar
  and one logical writer lane
- no merge or conflict-resolution code combines actor sidecars
- documentation distinguishes storage isolation from multi-writer support and
  from causal ownership evidence
- cross-actor merge semantics remain explicitly deferred
