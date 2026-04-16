---
title: language detection still mixes core logic with node path details
lane: graveyard
legend: CLEAN
---

# language detection still mixes core logic with node path details

## Disposition

Fixed in the current cleanup slice: src/parser/lang.ts now uses path-agnostic suffix normalization instead of node:path, and supported parser identities are explicit tuple-backed values with runtime guards instead of loose string-only typing.

## Original Proposal

File: `src/parser/lang.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- parser language selection still depends directly on `node:path`
- supported language identity is still light-weight string typing

Desired end state:
- keep extension normalization minimal and environment-agnostic
- strengthen supported-language identity beyond loose strings

Effort: S
