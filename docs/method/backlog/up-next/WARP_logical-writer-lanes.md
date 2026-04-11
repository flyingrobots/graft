# Logical WARP writer lanes

Stop treating WARP writer identity as a single hard-coded global writer
or as an incidental executor identity.

Why:
- `git-warp` supports multiple writers per graph
- worktrees of the same repo share `refs/warp/...` through the common
  Git dir
- writer IDs should describe logical mutation streams, not physical
  worker threads or processes

Design leaning:
- assign stable writer IDs to logical lanes such as:
  - monitor indexing for a repo
  - repo-scoped maintenance
  - future interactive structural write streams
- keep provenance stable if jobs migrate between workers
- make same-repo multi-writer behavior explicit rather than accidental

Questions:
- which job classes truly need distinct writer lanes
- how should writer-lane identity appear in receipts or observability
- how should this feed the same-repo concurrent-agent model

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: M
