# v0.8.0 Backlog Lane

Status: forming
Date: 2026-05-05

This lane holds shaped candidate cards for the eventual v0.8.0 release.
It is a scope-formation lane, not a release packet, publish plan, or
promise to tag soon.

Release truth still belongs in `docs/method/releases/v0.8.0/` and
user-facing release notes still belong in `docs/releases/` when release
prep actually starts. Cards in this lane are simply the current answer
to: "What work should v0.8.0 probably pull in?"

## Release Thesis

The v0.8.0 candidate shape is repo-generic operational truth:

- make PR and review activity easier to inspect
- reuse existing structural diff facts before adding new ontology
- keep health, review, and capability posture useful for any Git
  repository
- avoid embedding METHOD backlog, retro, dependency-DAG, or release
  conventions in Graft product surfaces

## Pull Order

| Priority | Card | Role |
| :--- | :--- | :--- |
| 1 | `CORE_pr-review-structural-summary` | Opening spine: structural PR review summary using shipped diff primitives. |
| 2 | `CORE_structural-test-coverage-map` | Follow-up review helper: structural/reference test coverage map. |
| 3 | `SURFACE_review-cooldown-status` | Optional operator helper for PR feedback loops. |

## Baseline Already Shipped

`CORE_graft-doctor` is part of the v0.8.0 context as shipped baseline,
not as an active card to reopen. Narrow doctor follow-ups can be filed
later if new evidence appears.

## Explicitly Out Of Lane

- `WARP_lsp-enrichment` continuation
- `CORE_migrate-to-slice-first-reads`
- daemon live refresh and daemon control-plane actions
- deterministic scenario replay
- METHOD backlog/status/release surfaces
- `SURFACE_pr-feedback-resolution-ledger`, unless the release thesis is
  deliberately widened around PR feedback operations
