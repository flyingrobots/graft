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
- show bounded symbol history for changed code
- flag removed symbols that were not re-added
- surface obvious structural test-reference gaps without pretending to
  prove execution coverage
- make automated review-loop readiness explicit
- reuse existing structural diff facts before adding new ontology
- keep review evidence useful for any Git repository
- avoid embedding METHOD backlog, retro, dependency-DAG, or release
  conventions in Graft product surfaces

## User Outcomes

After v0.8.0, a user should be able to answer seven questions without
reading a whole diff blindly:

1. What files changed structurally, and which changes are likely
   formatting or low-signal churn?
2. What bounded provenance hints explain changed symbols without
   guessing across ambiguous matches?
3. What is the structural history of a changed symbol across commits?
4. Which symbols disappeared and were not re-added?
5. Which changed or exported symbols have obvious test references, and
   which deserve review attention because no structural test reference
   is visible?
6. Is the automated review loop ready for another pass, or is it still
   cooling down?
7. Which review feedback items were addressed by which commits, and
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
| 4 | `WARP_symbol-history-timeline` | Per-symbol structural history for changed code. |
| 5 | `WARP_dead-symbol-detection` | Removed-symbol evidence for cleanup and API-surface shrinkage review. |
| 6 | `SURFACE_review-cooldown-status` | Review readiness helper for PR feedback loops. |
| 7 | `SURFACE_pr-feedback-resolution-ledger` | Local evidence ledger for unresolved feedback, fixes, SHAs, and markdown summaries. |
| 8 | `CORE_tool-context-injection-contracts` | Release hardening: prove review tools receive the resolved dependencies they were configured with. |
| 9 | `TEST_bounded-subprocess-policy` | Release hardening: prevent review tooling and tests from introducing unbounded subprocess hangs. |

## Language Breadth Candidate Pull Order

These cards broaden the same review-truth thesis by making structural
evidence useful in more repositories. Each card should land with suffix
detection, parser runtime coverage, outline extraction, structural diff
parity, real fixtures, and bounded degraded behavior for parse errors.

| Priority | Card | Role |
| :--- | :--- | :--- |
| 10 | `CORE_python-structural-parsing` | First broad-appeal parser expansion for AI, data, backend, and agent tooling repos. |
| 11 | `CORE_go-structural-parsing` | Infra, CLI, platform, and Kubernetes-adjacent codebases. |
| 12 | `CORE_sql-structural-parsing` | Database schemas, migrations, views, and stored routines. |
| 13 | `CORE_shell-structural-parsing` | High-risk automation scripts that agents frequently touch. |
| 14 | `CORE_yaml-structured-config` | GitHub Actions, Kubernetes, Compose, OpenAPI, and other repo control-plane files. |
| 15 | `CORE_toml-structured-config` | Python/Rust/package configuration and tool metadata. |
| 16 | `CORE_json-structured-config` | Package manifests, schema documents, lock-adjacent metadata, and config files. |
| 17 | `CORE_hcl-structured-config` | Terraform/OpenTofu infrastructure declarations. |
| 18 | `CORE_java-structural-parsing` | Enterprise backend and Android-adjacent repositories. |
| 19 | `CORE_csharp-structural-parsing` | .NET enterprise, tooling, and game-development repositories. |
| 20 | `CORE_c-structural-parsing` | Runtime, embedded, systems, and native extension repositories. |
| 21 | `CORE_cpp-structural-parsing` | Performance-critical, game engine, inference, and systems repositories. |
| 22 | `CORE_php-structural-parsing` | Long-lived production web repositories. |
| 23 | `CORE_ruby-structural-parsing` | Rails and Ruby toolchain repositories. |
| 24 | `CORE_swift-structural-parsing` | Apple-platform repositories. |
| 25 | `CORE_kotlin-structural-parsing` | Android and JVM service repositories. |
| 26 | `CORE_jupyter-notebook-structure` | Notebook-heavy AI/data repos with output-stripped structural projection. |

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
- full automatic breaking-change detection
