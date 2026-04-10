---
title: "Provenance and attribution instrumentation"
cycle: "0061-provenance-attribution-instrumentation"
design_doc: "docs/design/0061-provenance-attribution-instrumentation/provenance-attribution-instrumentation.md"
outcome: hill-met
drift_check: yes
---

# Provenance and attribution instrumentation Retro

## Summary

`0061` met the hill as the first runtime attribution packet on top of
persisted local `artifact_history`.

This cycle made actor attribution inspectable and evidence-bounded on
the bounded runtime surfaces that already carried continuity and staged
artifact posture.

The delivered contract is now real in code:

- persisted local-history summaries carry explicit attribution for the
  active causal workspace instead of forcing consumers to reverse
  engineer actor meaning from raw evidence arrays
- bounded inspection surfaces now expose that attribution directly
  through `doctor`, `causal_status`, and `causal_attach`
- runtime-local staged targets now project the current attribution
  summary so users and agents can inspect who or what Graft currently
  associates with the staged artifact
- persisted local `stage` events carry explicit attribution summaries
  as bounded `artifact_history`
- persisted local `read` events now also carry explicit attribution,
  source-layer posture, and explicit footprints instead of being
  invisible to the local provenance layer
- runtime honesty stayed intact: these claims are `artifact_history`,
  not canonical provenance, and `unknown` remains a lawful outcome when
  evidence is weak or mixed

The cycle also fixed a real bootstrap-order bug while widening the
runtime seam. Repo-local startup now establishes the `.graft`
exclusion before the initial workspace-router footing snapshot, which
removed a full-suite rename/staged-target flake without weakening the
truth model.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0061-provenance-attribution-instrumentation/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded during this cycle.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed
- [ ] Priorities reviewed
- [ ] Dead work buried or merged
