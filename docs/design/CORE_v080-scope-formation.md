---
title: "v0.8.0 scope formation"
legend: "CORE"
cycle: "CORE_v080-scope-formation"
source_backlog: "docs/method/backlog/asap/CORE_v080-scope-formation.md"
---

# v0.8.0 scope formation

Source backlog item: `docs/method/backlog/asap/CORE_v080-scope-formation.md`
Legend: CORE

## Hill

Settle the opening v0.8.0 lane before pulling more feature work.

The lane must keep Graft focused on Review Truth for any Git repository:
structural PR review summaries, bounded provenance hints, structural
test-reference signals, automated review readiness, and a local review
feedback evidence ledger. It must also name the first implementation
pull candidate, release-quality gates, and the work deliberately kept
out of the opening lane.

## Playback Questions

### Human

- [x] Can a human see that this cycle forms v0.8.0 scope instead of
      shipping runtime behavior?
- [x] Can a human identify the first implementation pull candidate and
      the follow-up candidates?
- [x] Can a human see which tempting work is explicitly deferred from
      the opening v0.8.0 lane?

### Agent

- [x] Does the scope decision mechanically agree with the current
      `docs/BEARING.md` next target?
- [x] Does the design keep METHOD backlog/status features out of Graft?
- [x] Does the design preserve the shipped doctor and capability
      posture work as baseline, not work to reopen in this cycle?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the scope decision is
  expressed as text tables and literal card ids, not inferred from a
  diagram.
- Non-visual or alternate-reading expectations: release lane, first
  pull, follow-ups, and deferrals are named in prose with stable
  backlog ids.

## Localization and Directionality

- Locale / wording / formatting assumptions: English repo docs and
  ASCII backlog ids.
- Logical direction / layout assumptions: no directional UI assumptions
  in this planning slice.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the lane spine,
  first implementation card, follow-up candidates, and excluded work.
- What must be attributable, evidenced, or governed: the decision must
  cite repo-visible backlog/design cards and the current bearing rather
  than relying on chat-only intent.

## Non-goals

- [ ] Add runtime behavior.
- [ ] Move METHOD backlog, retro, dependency-DAG, release, or
      project-management state into Graft product surfaces.
- [ ] Continue WARP LSP enrichment beyond the merged seam.
- [ ] Pull slice-first read migration before the needed git-warp
      observer geometry APIs exist.
- [ ] Add daemon live refresh or daemon control-plane actions to the
      default v0.8.0 spine.
- [ ] Reopen already shipped doctor or capability-posture cycles
      without a new, narrow follow-up card.

## Scope Decision

The opening v0.8.0 lane is:

> Review Truth for any Git repository.

That means the next implementation work should make a repository easier
to inspect and review without adding project-management features,
METHOD-specific status, broad release machinery, or another WARP
ontology expansion. The release should help users see structural diff
signal, bounded provenance hints, obvious structural test-reference
gaps, automated review readiness, and local feedback-resolution evidence
without claiming merge safety or semantic correctness.

## Shipped Baseline To Preserve

The opening lane inherits these shipped baselines:

- `CORE_graft-doctor`: shipped repo-generic health posture. Do not
  reopen unless a new narrow doctor follow-up is written.
- `CORE_three-surface-capability-baseline-and-parity-matrix`: shipped
  capability posture baseline across API, CLI, and MCP.
- `CORE_release-gate-for-three-surface-capability-posture`: shipped
  release gate for capability posture drift.
- `SURFACE_capability-matrix-truth`: shipped correction for composed
  CLI operator truth.

## Opening Lane

The opening lane is intentionally small:

- First implementation pull: `CORE_pr-review-structural-summary`.
  This is the best match for v0.8.0 structural review summaries; it is
  repo-generic and all prerequisites are marked shipped.
- Follow-up candidate: `CORE_structural-test-coverage-map`. This is a
  repo-generic review helper, but it must avoid claiming execution
  coverage.
- Evidence enrichment: `SURFACE_git-graft-enhance-provenance-hints`.
  This adds bounded creation/signature/reference hints for changed
  symbols without unbounded traversal or ambiguous guessing.
- Review readiness helper: `SURFACE_review-cooldown-status`. This
  keeps automated review-loop cooldowns explicit for PR authors and
  agents.
- Feedback evidence helper: `SURFACE_pr-feedback-resolution-ledger`.
  This keeps unresolved feedback, fix SHAs, reply status, and markdown
  summaries inspectable before any GitHub mutation.
- Release-quality gates: `CORE_tool-context-injection-contracts` and
  `TEST_bounded-subprocess-policy`. These are not user-facing review
  features, but they keep the review tools from growing on weak context
  injection or unbounded subprocess behavior.

The next pull after this scope cycle should be
`CORE_pr-review-structural-summary`. This card is promoted to the
`v0.8.0/` backlog lane as the concrete next candidate.

## Explicit Deferrals

- `WARP_lsp-enrichment` continuation: the seam has landed. Further
  LSP work is valid optional scope, not the opening v0.8.0 lane.
- `CORE_migrate-to-slice-first-reads`: explicitly blocked until
  git-warp observer geometry APIs land.
- `SURFACE_bijou-daemon-status-live-refresh`: daemon operator lane, not
  the default v0.8.0 spine.
- `SURFACE_bijou-daemon-control-plane-actions`: daemon operator lane and
  mutating control-plane work. Keep it separate from repo-generic
  review and health posture.
- `SURFACE_git-graft-enhance-expanded-git-subcommands`: broad command
  family expansion. Keep v0.8.0 focused on review paths rather than
  wrapping more Git verbs.
- `CI-003-mcp-native-diff-protocol`: valuable richer MCP protocol work,
  but it is a wire-format bet, not required for this Review Truth lane.
- METHOD backlog/status/release surfaces: belong in Method MCP / Method
  CLI, not Graft product surfaces.

No METHOD backlog/status product surface is part of this lane.

## Pull Criteria For The Next Cycle

Before pulling `CORE_pr-review-structural-summary`, preserve these
constraints:

- keep the first slice CLI-first or library-first, not GitHub Action
  first, unless the design proves the action boundary is small
- treat GitHub PR fetching as an adapter concern, not core review logic
- make the output explicitly structural and advisory
- do not claim semantic completeness, execution coverage, or merge
  readiness
- keep METHOD backlog/status state out of the result

## Backlog Context

Shape the opening v0.8.0 lane before pulling another implementation
cycle.

The current bearing says the immediate focus is v0.8.0 scope formation,
centered on Review Truth: structural PR review summaries, structural
test-reference signals, bounded provenance hints, automated review
readiness, and local review evidence for any Git repository.

This cycle should turn that direction into a small, inspectable lane:

- pick the first implementation pull candidate
- identify follow-up candidates that belong in the same release shape
- include release-quality gates that protect review-tool correctness
- state what is deliberately deferred
- avoid adding METHOD backlog/status features to Graft

The likely first candidate is `CORE_pr-review-structural-summary`, with
`SURFACE_git-graft-enhance-provenance-hints` and
`CORE_structural-test-coverage-map` as follow-ups,
`SURFACE_review-cooldown-status` as the review readiness helper, and
`SURFACE_pr-feedback-resolution-ledger` as the local review evidence
ledger.
