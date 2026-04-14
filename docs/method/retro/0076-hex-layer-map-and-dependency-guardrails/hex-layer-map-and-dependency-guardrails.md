---
title: "hex layer map and dependency guardrails"
cycle: "0076-hex-layer-map-and-dependency-guardrails"
design_doc: "docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-layer-map-and-dependency-guardrails.md"
outcome: hill-met
drift_check: yes
---

# hex layer map and dependency guardrails Retro

## Summary

Established the first truthful, mechanically enforced hex layer map for
the current repo. `eslint.config.js` now blocks forbidden dependency
directions across foundational contracts/pure helpers, ports, current
application modules, and current secondary adapters. The cycle also
updated `ARCHITECTURE.md` so it says the repo is converging on strict
hexagonal architecture instead of falsely claiming that posture is
already complete.

## Playback Witness

- [verification.md](./witness/verification.md)

## Drift

- None recorded.

## New Debt

- [CLEAN_top-level-directories-mix-hex-layers-and-force-file-level-guardrails](../../backlog/bad-code/CLEAN_top-level-directories-mix-hex-layers-and-force-file-level-guardrails.md)
- [CLEAN_parser-layer-role-is-architecturally-ambiguous](../../backlog/bad-code/CLEAN_parser-layer-role-is-architecturally-ambiguous.md)

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
