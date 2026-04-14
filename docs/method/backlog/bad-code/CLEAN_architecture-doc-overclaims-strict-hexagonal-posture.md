---
title: "architecture doc overclaims strict hexagonal posture"
legend: CLEAN
lane: bad-code
---

# architecture doc overclaims strict hexagonal posture

`ARCHITECTURE.md` currently claims Graft already has a strict hexagonal architecture, but repo truth is weaker: ports exist, yet application logic still lives inside MCP/CLI orchestration modules and WARP is not behind a first-class port. The doc should stop overclaiming until the convergence slices land.
