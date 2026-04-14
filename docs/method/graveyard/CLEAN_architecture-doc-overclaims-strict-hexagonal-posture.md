---
title: architecture doc overclaims strict hexagonal posture
legend: CLEAN
lane: graveyard
---

# architecture doc overclaims strict hexagonal posture

## Disposition

`ARCHITECTURE.md` now says the repo is converging on strict hexagonal architecture and explicitly notes that primary adapters and WARP boundary work are still mid-migration, so the specific overclaim captured by this note is no longer repo truth.

## Original Proposal

`ARCHITECTURE.md` currently claims Graft already has a strict hexagonal architecture, but repo truth is weaker: ports exist, yet application logic still lives inside MCP/CLI orchestration modules and WARP is not behind a first-class port. The doc should stop overclaiming until the convergence slices land.
