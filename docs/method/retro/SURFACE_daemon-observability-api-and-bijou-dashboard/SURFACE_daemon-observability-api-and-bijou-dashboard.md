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

Read-only architecture verification also established the target boundary:

- `npm run check:portable-target-specimen` passed in
  `profunctoroptics/website`.
- `node --test test/unit/portable-target-specimen.test.mjs` passed 3/3 in
  `profunctoroptics/website`.
- The specimen uses sibling Bijou and Geordi lowerers over one domain-owned
  artifact; it does not lower Bijou UI IR through Geordi.
- Bijou currently ships the terminal `ui-scene-ir/1` path, while Geordi ships
  browser Canvas lowering for `geordi-ir/1`.
- Wesley provides generator infrastructure and extension contracts, but no
  existing Bijou-to-Geordi semantic bridge.

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
