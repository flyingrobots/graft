# Invariant: Single Writer Is Honest

**Status:** Enforced (documentation)
**Legend:** WARP

## What must remain true

Level 1 operates under a single structural writer model. Code and
documentation must not imply multi-writer merge semantics.

## Why it matters

git-warp supports multi-writer CRDT semantics, but graft Level 1
uses a single writer (`graft`). If code or docs suggest multi-agent
concurrent writes are safe, users will build on a contract that
doesn't exist yet.

## How to check

- Writer ID is always `graft` in Level 1
- No merge/conflict resolution code in the indexer
- Documentation does not claim multi-writer support
- Multi-writer is explicitly deferred to a future level
