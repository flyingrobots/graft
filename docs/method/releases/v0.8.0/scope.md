# v0.8.0 Scope Decision

Status: scope forming
Date: 2026-05-01

## Current State

- `v0.7.0` shipped the main WARP, daemon-runtime, daemon-status,
  git-facing enhance, governed-edit, path-boundary, and Dockerized
  validation spine.
- `v0.7.1` shipped the npm package hygiene patch: `dist/` runtime
  artifacts, no published `src/`, development-only `tsx`, generated
  hook migration, and manual publish guards.
- Before this decision, the active backlog lanes were clear. This
  decision lanes `CORE_backlog-status-tool` into `asap/` as the next
  pull candidate; remaining unselected work stays mostly in
  `docs/method/backlog/cool-ideas/`.
- `WARP_lsp-enrichment` and `CORE_migrate-to-slice-first-reads` were
  intentionally preserved as post-v0.7.0 follow-up scope rather than
  release blockers.
- Regenerating the backlog DAG still reports two unresolved cool-ideas
  dependency refs to `CLEAN_CODE_export-diff-semver-signature-as-patch`.
  They are not part of the opening v0.8.0 lane, but should be cleaned
  when the affected WARP cards are next touched.

## Decision

Make v0.8.0 an operational-truth release unless a stronger blocker
appears.

The opening spine should be:

1. `CORE_backlog-status-tool`
2. `CORE_graft-doctor` relevance/scope check
3. optional `CORE_pr-review-structural-summary`

This keeps the next release close to the problems we just encountered:
release steering, backlog truth, METHOD drift, health checks, and PR
review evidence.

## Candidate Matrix

| Card | Current reality | v0.8.0 verdict | Next action |
| --- | --- | --- | --- |
| `CORE_backlog-status-tool` | Backlog cards, retros, design docs, and DAG metadata already exist, but agents still inspect them with ad hoc shell/Python scripts. | Required first slice. | Moved to `asap/`; pull next as a normal METHOD cycle. |
| `CORE_graft-doctor` | `graft doctor` and `graft diag doctor` already exist; `--sludge` is shipped. The card is partially stale. | Strong candidate after backlog status. | Run a scope check and narrow to shipped-check aggregation. |
| `CORE_pr-review-structural-summary` | `git graft enhance` and structural diff facts exist. | Optional v0.8.0 product surface. | Pull only after truth/status surfaces are stable. |
| `WARP_lsp-enrichment` | Bounded first-slice card exists and is valid, but introduces a semantic provider boundary and new WARP fact class. | Optional, not the default spine. | Keep in `cool-ideas` unless v0.8.0 explicitly becomes semantic-enrichment focused. |
| `CORE_migrate-to-slice-first-reads` | Remaining medium-risk full-scan reads are tracked; high-risk paths were mitigated. | Blocked. | Wait for git-warp observer geometry APIs. |
| `SURFACE_bijou-daemon-status-live-refresh` | Read-only daemon status first slice shipped. | Valid daemon-operator follow-up, not opening spine. | Defer unless v0.8.0 pivots to daemon operations. |
| `SURFACE_bijou-daemon-control-plane-actions` | Existing daemon mutation tools exist, but terminal action UX is sharp. | Defer. | Do not pull before live/status posture is boring. |
| `CI-002-deterministic-scenario-replay` | Logging and ports exist; full replay is still large. | Valuable but too large for opening slice. | Save for later scope pass or a concrete regression. |

## Non-Goals For Opening v0.8.0

- No governed write expansion.
- No native editor write interception.
- No broad LSP/tsserver project model.
- No daemon action TUI before read/status truth is stable.
- No slice-first migration until the upstream git-warp APIs exist.
- No release tag or publish work.

## First Pull Recommendation

Pull `CORE_backlog-status-tool`.

Start with RED tests for a deterministic status model over checked-in
backlog, design, retro, and dependency metadata. Rendering and CLI
wiring come after the model is boring. Keep it read-only and avoid
turning it into general METHOD automation in the first slice.
