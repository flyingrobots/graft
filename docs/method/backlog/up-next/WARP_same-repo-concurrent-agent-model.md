# Same-repo concurrent agent model

Design how Graft should handle multiple agents working in the same git
repository at the same time.

This needs to be explicit because the current Level 1 contract is still
single-writer-honest.

Questions:
- what is the difference between:
  - two agents in the same worktree
  - two agents in different worktrees of the same repo
  - two agents on different branches of the same repo
  - two agents touching the same files versus disjoint files
- what concurrency claims can Graft safely make without pretending
  multi-writer semantics already exist?
- what shared state, if any, should exist across MCP sessions in the
  same repo?
- what should be keyed by:
  - git common dir
  - worktree root
  - client/session id
- when should Graft surface:
  - concurrent read/write drift
  - potential edit collisions
  - semantic branch divergence
  - provenance uncertainty caused by overlapping actors
- how does this relate to the existing single-writer invariant and any
  future higher-level WARP model?

Deliverables:
- explicit same-repo concurrency model
- clear statement of supported versus unsupported concurrent scenarios
- explicit split between canonical repo history, worktree-local live
  state, and session-local agent state
- follow-on backlog split for conflict detection, shared observation
  state, or multi-writer evolution if needed

Current design leaning:
- same repo in different worktrees should share canonical history but
  not be collapsed into one live workspace
- same worktree with multiple agents should be supported
  observationally, but with provenance uncertainty rather than fake
  single-actor confidence
- multi-writer merge semantics remain out of scope until a later WARP
  level

Related:
- `docs/invariants/single-writer-honest.md`
- `docs/method/backlog/cool-ideas/CORE_multi-agent-conflict-detection.md`

Why separate cycle:
- this is deeper than conflict detection; it is a contract question
  about repo truth, writers, and concurrent observation

Effort: L
