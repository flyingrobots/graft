# Advanced Guide

This guide is the release-facing signpost for operators and
contributors who need more than setup instructions.

## Use this guide for

- understanding the same-user local daemon posture
- understanding hook/bootstrap coverage and degraded footing
- understanding the boundary between bounded local `artifact_history`
  and canonical provenance
- understanding why release prep pauses the repo after a cycle close

## Current advanced topics

### Daemon posture

`graft daemon` is a same-user local runtime with explicit workspace
authorization, session binding, monitor control, and bounded daemon
inspection surfaces.

### Reactive footing

Checkout-boundary footing is explicit. Graft can report installed hook
coverage, hook-observed transitions, and degraded posture when local
edit watchers are absent.

### Same-repo concurrency

Graft now distinguishes bounded same-repo postures such as
`exclusive`, `shared_repo_only`, `shared_worktree`,
`overlapping_actors`, and `divergent_checkout` without pretending
multi-writer provenance already exists.

### Between-commit activity

`activity_view` and `graft diag activity` expose bounded local
between-commit `artifact_history`. This is not canonical provenance
and not causal collapse.

## Related docs

- [README](./README.md)
- [Guide](./GUIDE.md)
- [Setup Guide](./docs/SETUP.md)
- [CLI Guide](./docs/CLI.md)
- [MCP Guide](./docs/MCP.md)
- [Architecture](./ARCHITECTURE.md)
- [Security Model](./docs/strategy/security-model.md)
- [Causal Provenance](./docs/strategy/causal-provenance.md)
- [Bearing](./docs/BEARING.md)
- [Vision](./docs/VISION.md)
