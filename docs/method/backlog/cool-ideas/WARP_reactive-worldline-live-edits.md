# Reactive worldline for live edits

`code_show` and `code_find` should stay correct while the working tree
is dirty. That is a correctness requirement, not a watcher feature.
The first rule is simple: if the working tree diverges from indexed
history, reads must fall back to live facts instead of serving stale
graph answers.

The watcher idea is still compelling, but it should be additive:

- Correctness path: live fallback on dirty state, including untracked
  draft files and unstaged edits
- Reactivity path: observe filesystem and git activity so Graft can
  build a semantic account of what changed without waiting for an
  explicit query

The dangerous edge case is repository churn from git operations:
branch switches, resets, rebases, merges, or sparse-checkout changes
can move dozens or hundreds of files at once. A naive file watcher
would emit meaningless per-file noise.

Recommended posture:
- Treat watcher events as low-level signals, not user-facing facts
- Detect repo-level transitions such as checkout/reset/merge and
  synthesize them into one semantic batch event
- Recompute structural meaning after the transition instead of
  narrating a storm of raw file events
- Distinguish human edits, agent edits, and git-induced state changes
  where possible, but do not make correctness depend on attribution
- Keep WARP history commit-grounded; live edit tracking should be a
  separate transient layer unless and until a principled sub-commit
  model exists

Open design question:
- Should the transient live-edit layer be queryable as a short-lived
  overlay on top of the commit-grounded worldline, or should it remain
  an internal signal used only to route reads and diagnostics?
