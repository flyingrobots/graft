---
title: "Daemon observability REST API and Bijou operator dashboard"
cycle: "SURFACE_daemon-observability-api-and-bijou-dashboard"
source_card: "docs/method/backlog/cool-ideas/SURFACE_daemon-observability-api-and-bijou-dashboard.md"
outcome: hill-met
drift_check: yes
---

# Daemon observability REST API and Bijou operator dashboard Retro

## Summary

This documentation cycle filed an evidence-backed COOL IDEA for daemon-wide
observability, a versioned local read API, and an operator dashboard. It also
updated the generated backlog dependency graph so the new leaf appears in the
repository's planning topology.

No runtime behavior or public contract changed in this cycle. Implementation
still requires a design packet with locked acceptance criteria, playback
questions, non-goals, and a test strategy.

## Playback Witness

- The source card defines bounded daemon-owned metrics, semantic service
  health, shared application queries, a read-only local REST API, and a Bijou
  TUI as the first dashboard target.
- The card defines one Graft-owned semantic dashboard artifact and independent
  sibling lowerers for Bijou and Geordi.
- The Bijou path owns `ui-scene-ir/1`, `Surface`, and terminal receipts. The
  Geordi path owns `geordi-ir/1`, browser Canvas rendering, and render
  receipts.
- Cross-target conformance compares semantic identities, actions, source
  digests, and capability residuals without claiming pixel parity.

## Validation Evidence

Recorded cycle validation:

```text
pnpm vitest run test/unit/method/backlog-dependency-dag.test.ts

Test Files  1 passed (1)
Tests       2 passed (2)
```

```text
pnpm lint

passed
```

```text
git diff --check

passed
```

Read-only architecture verification at immutable revisions also established
the target boundary:

- `npm run check:portable-target-specimen` passed in
  [`profunctoroptics/website` at `2cd7cc1e`](https://github.com/flyingrobots/profunctor-optics-website/tree/2cd7cc1e8af2504633d6ac16f7df4a6b110bdd2e).
- `node --test test/unit/portable-target-specimen.test.mjs` passed 3/3 in
  that same tree.
- The specimen uses sibling Bijou and Geordi lowerers over one domain-owned
  artifact; it does not lower Bijou UI IR through Geordi.
- The inspected
  [Bijou lowerer at `4412ec6d`](https://github.com/flyingrobots/bijou/blob/4412ec6dbce947887ed6ea2740ecbad0a66d122e/packages/bijou/src/core/profunctor-page-target.ts)
  owns the terminal `ui-scene-ir/1` path, while the inspected
  [Geordi lowerer at `f68160fc`](https://github.com/flyingrobots/geordi/tree/f68160fcbbada657b2465ae1a42e3fb7403f32ae/packages/profunctor-page)
  owns browser Canvas lowering for `geordi-ir/1`.
- Inspection of
  [Wesley's extension-generation contract at `4891a631`](https://github.com/flyingrobots/wesley/blob/4891a631f888c5b2f70e117e3704538dd1362c2f/crates/wesley-core/src/domain/extension_generation.rs)
  found generator infrastructure and extension contracts, but no
  Bijou-to-Geordi semantic bridge in that tree.

## Drift Check

The initial card left the browser boundary dependent on future Bijou renderer
work. Cross-repository inspection showed that the completed Profunctor Page
portability proof uses a stronger boundary: one domain-owned artifact with
independent sibling target lowerers. The card was corrected to follow that
proven architecture.

This was intended design refinement, not implementation-scope growth. The
first delivery remains the Bijou TUI; the Geordi browser target remains later
work with its own profile, conformance corpus, receipt, and security gateway.

## Findings

- The semantic dashboard model belongs to Graft because Graft owns health,
  freshness, metric, failure, and control-action meaning.
- Bijou and Geordi should own target lowering and rendering, not Graft's
  operational semantics.
- `ui-scene-ir/1` is not a generic input to Geordi today.
- A browser dashboard does not require Bijou to acquire a DOM renderer.

## Backlog Maintenance

- Filed
  [`SURFACE_daemon-observability-api-and-bijou-dashboard`](../../backlog/cool-ideas/SURFACE_daemon-observability-api-and-bijou-dashboard.md).
- No additional bad-code or cool-idea cards were required by this cycle.
- The next implementation cycle must promote the work into `docs/design/`
  before RED/GREEN work begins.

## Why This Cycle Closes Cleanly

The hill was to preserve the observability and control-plane idea as an
inspectable, dependency-aware backlog artifact with an architecture grounded
in shipped cross-repository evidence. The card and generated dependency graph
now exist, the target ownership boundary is explicit, the focused structural
checks pass, and no runtime claim is being made.
