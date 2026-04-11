# Release Design: v0.5.0

## Included cycles

- **Cycle 0058** — daemon execution substrate and worker/lane fairness
- **Cycle 0059** — graph ontology and causal collapse model
- **Cycle 0060** — persisted sub-commit local history
- **Cycle 0061** — provenance attribution instrumentation
- **Cycle 0062** — reactive workspace overlay
- **Cycle 0063** — richer semantic transitions
- **Cycle 0064** — same-repo concurrent agent model
- **Cycle 0065** — between-commit activity view

## Hills advanced

- **SURFACE**: Graft now has a human-facing answer to "what happened
  between the last Git commit and now?" through bounded local
  `artifact_history` on MCP and CLI.
- **WARP**: the repo now carries the settled ontology and local-history
  substrate needed for later causal-slice / collapse work, while
  keeping the current release honest about what is still only local
  artifact history.
- **Operational truth**: workspace footing, semantic transitions, and
  same-repo concurrency are now explicit product surfaces rather than
  hidden inference.

## Sponsored users

- **Humans**: get the first bounded between-commit activity view
  without chat-log reconstruction.
- **Coding agents**: keep the bounded machine-readable surfaces for
  local history, attribution, transitions, and footing.
- **Operators**: get a cleaner release-facing CLI/MCP/doc story around
  the now-shipped activity view.
- **Contributors**: get a repo paused cleanly after a closed cycle
  instead of another active packet bleeding into release prep.

## Version justification

**Minor** (0.4.0 → 0.5.0).

This is a minor release because it adds a new externally meaningful
surface and a much broader runtime meaning layer:

- first human-facing between-commit activity surface
- persisted local artifact-history substrate
- explicit attribution, footing, semantic-transition, and concurrency
  posture
- thin CLI peer wrapper for activity inspection

The changes are broader than a patch but remain compatible with the
pre-1.0 product posture.

## Migration

Migration is light, but there are a few things to call out:

- Existing bootstrap and serve posture remain valid.
- The new recommended human-facing inspection path is
  `graft diag activity` or MCP `activity_view`.
- Full causal collapse and canonical provenance admission are still
  out of scope for this release.

## Release acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.5.0`
- `CHANGELOG.md` has a `0.5.0` section covering the shipped surface
- `docs/releases/v0.5.0.md` is final
- `docs/method/releases/v0.5.0/verification.md` is filled with actual
  preflight/tag/publish evidence
- `pnpm release:check` passes on the final release commit
