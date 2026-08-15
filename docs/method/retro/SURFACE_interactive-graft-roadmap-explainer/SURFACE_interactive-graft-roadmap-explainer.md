---
title: "Interactive Graft roadmap explainer"
cycle: "SURFACE_interactive-graft-roadmap-explainer"
design_doc: "docs/design/SURFACE_interactive-graft-roadmap-explainer.md"
outcome: hill-met
drift_check: yes
---

# Interactive Graft roadmap explainer Retro

## Summary

This cycle produced a static, deployable architecture field guide that teaches
why Graft has two roadmaps and where work stands on each. One real
`file_outline("src/mcp/server.ts")` request carries the explanation from
today's `LiveWorkspaceReadSource`, through issue #228's unknown-basis retained
observation, and onward to the G0-G12 managed-workspace product program.

Two interactive Sugiyama DAG families expose campaign, proof, goalpost, and
all-task views. The Echo graph preserves live native blockers and separates
them from completed stale prerequisites and document-only context. The managed
graph expands all 105 task issues through goalpost membership gates without
inventing native blockers or a dependency between every numbered slice.

The site includes keyboard node traversal, search, status filtering, pan/zoom,
textual dependency fallbacks, a rendered Mermaid sequence, source provenance,
claims-versus-evidence drift, a checked-in static build, a Cloudflare
Worker-compatible entrypoint, and a matching social-preview image.

## Playback Witness

- [verification.md](./witness/verification.md)
- The companion [guided explainer](../../../explainers/graft-roadmaps/README.md)
  carries the same canonical example and validated Mermaid source as the site.

## Drift

- The initial task-graph design described ordered slices as edges. Repository
  evidence did not establish that every numbered slice blocks the next. The
  implementation instead places all 105 tasks between synthetic goalpost entry
  and exit gates, making membership explicit without manufacturing dependency.
- Live GitHub evidence confirmed the two planning altitudes and four existing
  tracker discrepancies: G0 task completion versus open milestone state, G1
  partial implementation versus zero closed task issues, stale expected-basis
  language in #228, and the Echo-native milestone aggregate mismatch.
- The local in-app Browser runtime exposed no browser instance. The cycle does
  not claim visual browser QA. It added deterministic DOM interaction checks
  for both graph workbenches and retained the limitation in the witness.
- Sites publication required a small static Worker entrypoint. It delegates
  assets unchanged, falls back to `index.html` only for navigation routes, and
  preserves 404 responses for missing asset paths.

## What surprised you?

The managed task inventory was more regular than the milestone administration:
the 105 task issues are a contiguous #97-#201 sequence, while milestone state
and aggregate counts still contain drift. That made data generation reliable
but reinforced why the site must never equate tracker administration with
executable completion.

The more important graph-design surprise was epistemic. A visually satisfying
chain between every task would have been easy to produce and wrong to present
as dependency truth. Synthetic membership gates produced a denser graph but a
more honest one.

## What would you do differently?

Define edge evidence classes before sketching the first graph. Native blockers,
normative roadmap sequence, goalpost membership, completed prerequisites, and
architectural convergence need different data and different styling. Making
that distinction first would have avoided the initial slice-order wording.

For a later refresh, obtain a browser instance before the visual phase so the
same validated build can receive screenshot and responsive-layout inspection
in addition to DOM behavior coverage.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Follow-up Items

- Refresh the dated tracker snapshot when #228, G1, or native blocker state
  changes materially.
- Keep live tracker mutation, generic roadmap management, and implementation of
  either roadmap outside this explanatory surface.

## Backlog Maintenance

- [x] No product or architecture defect introduced by this cycle was deferred.
- [x] Existing tracker drift is cited as source evidence rather than filed as
      duplicate debt.
- [x] No roadmap task, milestone, or dependency was mutated by the explainer.
