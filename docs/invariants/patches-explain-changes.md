# Invariant: Patches Explain Changes

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

Every structural change emitted by WARP must be explainable as
concrete add/remove/change operations.

## Why it matters

The explainability posture depends on agents being able to inspect
exactly what changed and why. No opaque "something changed" patch
records. Every structural delta is a list of operations an agent
can read, understand, and act on.

## How to check

- No opaque or summary-only patch records
- Changed symbol properties identify which fields changed
  (signature, exported, line range)
- Commit metadata (sha, message, timestamp) remains attached
- Test: index a commit with known changes, verify patch ops match
  the expected structural delta
