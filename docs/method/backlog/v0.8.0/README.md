# v0.8.0 Backlog Lane: Review Truth

Status: forming
Date: 2026-05-05

This lane holds shaped candidate cards for the eventual v0.8.0 release.
It is a scope-formation lane, not a release packet, publish plan, or
promise to tag soon.

Release truth still belongs in `docs/method/releases/v0.8.0/` and
user-facing release notes still belong in `docs/releases/` when release
prep actually starts. Cards in this lane are simply the current answer
to: "What does v0.8.0 give users?"

## Release Thesis

The v0.8.0 candidate shape is **Review Truth**:

- tell PR authors and reviewers what changed structurally
- surface obvious structural test-reference gaps without pretending to
  prove execution coverage
- make automated review-loop readiness explicit
- reuse existing structural diff facts before adding new ontology
- keep review evidence useful for any Git repository
- avoid embedding METHOD backlog, retro, dependency-DAG, or release
  conventions in Graft product surfaces

## User Outcomes

After v0.8.0, a user should be able to answer five questions without
reading a whole diff blindly:

1. What files changed structurally, and which changes are likely
   formatting or low-signal churn?
2. What bounded provenance hints explain changed symbols without
   guessing across ambiguous matches?
3. Which changed or exported symbols have obvious test references, and
   which deserve review attention because no structural test reference
   is visible?
4. Is the automated review loop ready for another pass, or is it still
   cooling down?
5. Which review feedback items were addressed by which commits, and
   what summary can be rendered before posting back to GitHub?

The release must not claim merge readiness, semantic correctness, or
execution coverage. It should provide bounded structural evidence that a
human or agent can inspect.

## Pull Order

| Priority | Card | Role |
| :--- | :--- | :--- |
| 1 | `CORE_pr-review-structural-summary` | Opening spine: structural PR review summary using shipped diff primitives. |
| 2 | `CORE_structural-test-coverage-map` | Follow-up review helper: structural/reference test coverage map. |
| 3 | `SURFACE_git-graft-enhance-provenance-hints` | Bounded provenance hints for changed symbols in review summaries. |
| 4 | `SURFACE_review-cooldown-status` | Review readiness helper for PR feedback loops. |
| 5 | `SURFACE_pr-feedback-resolution-ledger` | Local evidence ledger for unresolved feedback, fixes, SHAs, and markdown summaries. |
| 6 | `CORE_tool-context-injection-contracts` | Release hardening: prove review tools receive the resolved dependencies they were configured with. |
| 7 | `TEST_bounded-subprocess-policy` | Release hardening: prevent review tooling and tests from introducing unbounded subprocess hangs. |

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
- expanded `git graft enhance` subcommands beyond the review path
- MCP-native Diff protocol changes
