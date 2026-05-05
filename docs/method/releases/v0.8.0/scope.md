# v0.8.0 Scope Decision

Status: backlog lane formed
Date: 2026-05-05

## Current State

- `v0.7.0` shipped the main WARP, daemon-runtime, daemon-status,
  git-facing enhance, governed-edit, path-boundary, and Dockerized
  validation spine.
- `v0.7.1` shipped the npm package hygiene patch: `dist/` runtime
  artifacts, no published `src/`, development-only `tsx`, generated
  hook migration, and manual publish guards.
- Before this cleanup, `CORE_backlog-status-tool` was incorrectly
  laned as the next Graft pull candidate. That was product-boundary
  drift: METHOD-specific backlog/status surfaces belong in Method MCP /
  Method CLI, not Graft.
- `WARP_lsp-enrichment` and `CORE_migrate-to-slice-first-reads` were
  intentionally preserved as post-v0.7.0 follow-up scope rather than
  release blockers.
- Regenerating the backlog DAG still reports two unresolved cool-ideas
  dependency refs to `CLEAN_CODE_export-diff-semver-signature-as-patch`.
  They are not part of the opening v0.8.0 lane, but should be cleaned
  when the affected WARP cards are next touched.

## Decision

Make v0.8.0 a **Review Truth** release candidate shape unless a stronger
blocker appears.

The opening spine should be repo-generic:

1. `CORE_pr-review-structural-summary`
2. `CORE_structural-test-coverage-map`
3. `SURFACE_git-graft-enhance-provenance-hints`
4. `WARP_symbol-history-timeline`
5. `WARP_dead-symbol-detection`
6. `SURFACE_review-cooldown-status`
7. `SURFACE_pr-feedback-resolution-ledger`
8. release hardening through `CORE_tool-context-injection-contracts`
   and `TEST_bounded-subprocess-policy`

This gives users bounded review evidence: what changed structurally,
which changed symbols have bounded provenance hints, what has obvious
structural history, which symbols disappeared and were not re-added,
what has obvious structural test references, whether the automated
review loop is ready for another pass, and which feedback items were
addressed by which commits. It keeps Graft repo-generic without making
it depend on METHOD project conventions.

The shaped candidate lane lives at `docs/method/backlog/v0.8.0/`. It is
not a release packet and does not imply that v0.8.0 is ready to cut.

## Candidate Matrix

| Card | Current reality | v0.8.0 verdict | Next action |
| --- | --- | --- | --- |
| `CORE_backlog-status-tool` | Backlog cards, retros, design docs, and DAG metadata are METHOD-domain truth surfaces, not repo-generic Graft surfaces. | Canceled for Graft. | Moved to `docs/method/graveyard/`; re-home in Method MCP / Method CLI if still wanted. |
| `CORE_graft-doctor` | `graft doctor` and `graft diag doctor` already exist; `--sludge` is shipped. The original card overreached into all-integrity-check CI gate semantics. | Shipped baseline, not an active v0.8.0 card. | Reopen only with a narrow follow-up card backed by new evidence. |
| `CORE_pr-review-structural-summary` | `git graft enhance` and structural diff facts exist. | Opening v0.8.0 product surface. | Pull first from `docs/method/backlog/v0.8.0/`. |
| `CORE_structural-test-coverage-map` | Existing map, outline, and reference primitives can support a structural/reference-based test coverage report. | Included v0.8.0 review helper. | Pull after the PR review summary to expose structural test-reference signals. |
| `SURFACE_git-graft-enhance-provenance-hints` | Structural blame and reference counts already exist; review summaries can use bounded symbol-level provenance. | Included v0.8.0 review evidence helper. | Add bounded hints without expanding into arbitrary Git command wrapping. |
| `WARP_symbol-history-timeline` | Commit-to-symbol edges with signatures are shipped and already support chronological per-symbol history. | Included v0.8.0 review lens. | Add a small query for the structural timeline of a changed symbol. |
| `WARP_dead-symbol-detection` | Commit-to-symbol removal edges are shipped and can identify symbols removed and not re-added. | Included v0.8.0 review lens. | Add removed-symbol evidence without taking on full breaking-change automation. |
| `SURFACE_review-cooldown-status` | PR feedback loops currently require manual parsing of automated reviewer cooldown comments. | Included v0.8.0 helper. | Pull after the structural review surfaces unless cooldown friction blocks review iteration first. |
| `SURFACE_pr-feedback-resolution-ledger` | Feedback processing currently stitches review threads, local commits, and PR replies by hand. | Included v0.8.0 evidence ledger. | Render local markdown summaries by default; require explicit confirmation or flags for GitHub mutation. |
| `CORE_tool-context-injection-contracts` | A prior review found that resolved composition-root dependencies can be bypassed by ToolContext wiring. | Release hardening gate. | Prove review tools receive the configured dependencies they are supposed to use. |
| `TEST_bounded-subprocess-policy` | Docker autostart and child-process tests exposed the risk of unbounded subprocess hangs. | Release hardening gate. | Add policy/regression coverage before review tooling grows more subprocess paths. |
| `SURFACE_git-graft-enhance-expanded-git-subcommands` | The broader enhance vision includes many Git-adjacent verbs. | Defer. | Keep v0.8.0 on review paths instead of broad command expansion. |
| `CI-003-mcp-native-diff-protocol` | Richer MCP diff rendering would improve client UX but changes response protocol shape. | Defer. | Revisit after Review Truth surfaces are stable. |
| `WARP_auto-breaking-change-detection` | Breaking-change detection is directly review-adjacent but depends on export-diff semver classification and dead-symbol detection. | Defer. | Revisit after the smaller dead-symbol primitive and export-diff fix exist. |
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
- No METHOD-specific backlog/status surfaces in Graft.
- No release tag or publish work.

## First Pull Recommendation

Pull `CORE_pr-review-structural-summary` from
`docs/method/backlog/v0.8.0/` when implementation work resumes.

The first slice should compose existing structural diff facts into a
small review summary model and CLI surface. Do not start with GitHub
Action posting, do not claim merge readiness, and do not rebuild METHOD
backlog status inside Graft.

## User-Facing Promise

Graft 0.8.0 helps PR authors and reviewers focus on the changes that
matter by summarizing structural diff signal, surfacing obvious
test-reference gaps, adding bounded provenance hints, exposing symbol
history and removed-symbol evidence, tracking review readiness, and
recording local feedback-resolution evidence without project-specific
workflow assumptions.
