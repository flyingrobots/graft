# WARP: Per-branch worldlines

Rejected as the primary storage model.

Why it was proposed:
- branch-scoped questions are genuinely useful
- PR and divergence views naturally sound branch-shaped

Why it was rejected:
- branch names are not stable durable identities
- the same commit can belong to multiple branches
- rebases, renames, and force-moves make branch-backed storage easy to
  duplicate or corrupt conceptually
- the user-centered need is "answer branch questions," not "store a
  second truth per branch"

Superseded by:
- `docs/design/0025-layered-worldline-model/design.md`

Replacement model:
- one canonical commit worldline
- branch/ref views over that worldline
- one transient workspace overlay for dirty local state

If this idea is revived, it should justify why branch-specific durable
storage answers something the layered model cannot answer through
ref-based views.
