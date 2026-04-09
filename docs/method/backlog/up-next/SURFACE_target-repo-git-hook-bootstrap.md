# Target-repo git hook bootstrap

Graft likely needs repo-local Git hook integration in target repos if
the product truth is "track meaningful activity between hard Git
commits" for both agent-driven and human-driven work.

Why this is distinct work:
- live MCP instrumentation only sees tool-mediated activity
- filesystem watchers can see edits, but they do not give durable Git
  checkpoints by themselves
- commit, checkout, merge, and rewrite are canonical transition moments
  that Git already exposes through hooks

Likely hook surfaces:
- `post-commit` for collapse checkpoints, indexing advancement, and
  commit-linked provenance projection
- `post-checkout`, `post-merge`, and `post-rewrite` for checkout epoch
  transitions and workspace-overlay interpretation
- possibly `pre-commit` only if we need access to staged-target intent
  before commit finalization, rather than deriving it from the resulting
  commit diff

Questions:
- should `graft init` install product hooks in the target repo, not just
  client config
- how do we compose with an existing `core.hooksPath` or existing hook
  scripts without hijacking repo-local developer workflows
- what is the minimum lawful hook shim: thin forwarder to MCP/daemon or
  real local logic
- which events are required for persisted sub-commit local history
  versus merely nice to have
- how do we degrade honestly when hooks are absent

Related:
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/WARP_richer-semantic-transitions.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`

Effort: M
